import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { decifrar, decifrarOpcional } from "@/lib/cripto";
import {
  acessoApenasEmergencial,
  concessaoVigente,
  podeAbrirProntuario,
  podeLerConteudoTecnico,
  podeVerRegistro,
  type Ator,
  type Concessao,
} from "@/lib/permissoes";
import type { Respostas } from "@/lib/fonar";
import type { Especialidade } from "@/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (v: string) => UUID.test(v);

export type InfoUnidade = { id: string; nome: string; sigla: string; cor: string; ativa: boolean };
export type InfoPessoa = { id: string; nome: string; especialidade: Especialidade | null; registroProfissional: string | null };

/** Unidades e profissionais da rede (tabelas pequenas — carregadas por inteiro). */
export async function mapasRede() {
  const [unidades, pessoas] = await Promise.all([
    db
      .select({
        id: schema.unidades.id,
        nome: schema.unidades.nome,
        sigla: schema.unidades.sigla,
        cor: schema.unidades.cor,
        ativa: schema.unidades.ativa,
      })
      .from(schema.unidades)
      .orderBy(schema.unidades.nome),
    db
      .select({
        id: schema.usuarios.id,
        nome: schema.usuarios.nome,
        especialidade: schema.usuarios.especialidade,
        registroProfissional: schema.usuarios.registroProfissional,
      })
      .from(schema.usuarios),
  ]);
  const semUnidade: InfoUnidade = { id: "", nome: "Unidade removida", sigla: "?", cor: "#64748b", ativa: false };
  const semPessoa: InfoPessoa = { id: "", nome: "—", especialidade: null, registroProfissional: null };
  const u = new Map(unidades.map((x) => [x.id, x]));
  const p = new Map(pessoas.map((x) => [x.id, x]));
  return {
    /** Todas as unidades, em ordem alfabética. */
    unidades,
    unidade: (id: string | null | undefined) => (id && u.get(id)) || semUnidade,
    pessoa: (id: string | null | undefined) => (id && p.get(id)) || semPessoa,
  };
}

export async function concessoesDoProntuario(prontuarioId: string) {
  return db
    .select()
    .from(schema.acessos)
    .where(eq(schema.acessos.prontuarioId, prontuarioId))
    .orderBy(asc(schema.acessos.criadoEm));
}

export type ResultadoCarga =
  | { situacao: "nao-encontrado" }
  | { situacao: "sem-acesso"; prontuario: schema.Prontuario }
  | {
      situacao: "ok";
      prontuario: schema.Prontuario;
      concessoes: (typeof schema.acessos.$inferSelect)[];
      apenasEmergencial: boolean;
      expiraEmergencialEm: Date | null;
    };

export async function carregarProntuario(ator: Ator, id: string): Promise<ResultadoCarga> {
  if (!ehUuid(id)) return { situacao: "nao-encontrado" };
  // As duas consultas saem juntas: com o banco longe, cada ida e volta conta.
  const [[prontuario], concessoes] = await Promise.all([
    db.select().from(schema.prontuarios).where(eq(schema.prontuarios.id, id)).limit(1),
    concessoesDoProntuario(id),
  ]);
  if (!prontuario) return { situacao: "nao-encontrado" };
  if (!podeAbrirProntuario(ator, concessoes as Concessao[])) return { situacao: "sem-acesso", prontuario };
  const apenasEmergencial = acessoApenasEmergencial(ator, concessoes as Concessao[]);
  const expiraEmergencialEm = apenasEmergencial
    ? concessoes
        .filter((c) => c.unidadeId === ator.unidadeId && concessaoVigente(c as Concessao))
        .map((c) => c.expiraEm)
        .filter((d): d is Date => !!d)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    : null;
  return { situacao: "ok", prontuario, concessoes, apenasEmergencial, expiraEmergencialEm };
}

export function cadastroDecifrado(p: schema.Prontuario) {
  return {
    cpf: decifrarOpcional(p.cpfCifrado),
    telefone: decifrarOpcional(p.telefoneCifrado),
    orientacoesContato: decifrarOpcional(p.orientacoesContatoCifrado),
    endereco: decifrarOpcional(p.enderecoCifrado),
  };
}

type Mapas = Awaited<ReturnType<typeof mapasRede>>;

/**
 * Busca os registros do prontuário como estão no banco (cifrados). Pode sair junto com a checagem de acesso, mas
 * só passe o resultado para `montarConteudo` depois de confirmar que a pessoa pode abrir o prontuário.
 */
export async function buscarRegistros(prontuarioId: string) {
  const [relatos, atendimentos, avaliacoes, encaminhamentos, medidas, autores] = await Promise.all([
    db.select().from(schema.relatos).where(eq(schema.relatos.prontuarioId, prontuarioId)).orderBy(desc(schema.relatos.criadoEm)),
    db
      .select()
      .from(schema.atendimentos)
      .where(eq(schema.atendimentos.prontuarioId, prontuarioId))
      .orderBy(desc(schema.atendimentos.realizadoEm)),
    db
      .select()
      .from(schema.avaliacoesRisco)
      .where(eq(schema.avaliacoesRisco.prontuarioId, prontuarioId))
      .orderBy(desc(schema.avaliacoesRisco.criadoEm)),
    db
      .select()
      .from(schema.encaminhamentos)
      .where(eq(schema.encaminhamentos.prontuarioId, prontuarioId))
      .orderBy(desc(schema.encaminhamentos.criadoEm)),
    db
      .select()
      .from(schema.medidasProtetivas)
      .where(eq(schema.medidasProtetivas.prontuarioId, prontuarioId))
      .orderBy(desc(schema.medidasProtetivas.criadoEm)),
    db.select().from(schema.autores).where(eq(schema.autores.prontuarioId, prontuarioId)).orderBy(asc(schema.autores.criadoEm)),
  ]);
  return { relatos, atendimentos, avaliacoes, encaminhamentos, medidas, autores };
}

export type RegistrosProntuario = Awaited<ReturnType<typeof buscarRegistros>>;

/** Carrega todo o conteúdo do prontuário, já filtrado pelo que a pessoa pode ver. */
export async function carregarConteudo(ator: Ator, prontuarioId: string, mapas: Mapas) {
  return montarConteudo(ator, await buscarRegistros(prontuarioId), mapas);
}

/** Decifra e filtra os registros conforme o que a pessoa pode ver. */
export function montarConteudo(ator: Ator, registros: RegistrosProntuario, mapas: Mapas) {
  const tecnica = podeLerConteudoTecnico(ator);
  const { relatos, atendimentos, avaliacoes, encaminhamentos, medidas, autores } = registros;

  const retificadoPor = (lista: { id: string; retificaId: string | null; criadoEm: Date }[]) => {
    const m = new Map<string, { id: string; criadoEm: Date }>();
    for (const r of lista) if (r.retificaId) m.set(r.retificaId, { id: r.id, criadoEm: r.criadoEm });
    return m;
  };
  const relatosRetificados = retificadoPor(relatos);
  const atendimentosRetificados = retificadoPor(atendimentos);

  return {
    relatos: relatos.map((r) => {
      const visivel = podeVerRegistro(ator, r);
      return {
        id: r.id,
        criadoEm: r.criadoEm,
        dataFato: r.dataFato,
        tiposViolencia: visivel ? r.tiposViolencia : [],
        sigilo: r.sigilo,
        especialidade: r.especialidade,
        unidade: mapas.unidade(r.unidadeId),
        autor: mapas.pessoa(r.autorId),
        visivel,
        texto: visivel ? decifrar(r.textoCifrado) : null,
        localFato: visivel ? decifrarOpcional(r.localFatoCifrado) : null,
        retificaId: r.retificaId,
        motivoRetificacao: visivel ? r.motivoRetificacao : null,
        retificadoPor: relatosRetificados.get(r.id) ?? null,
      };
    }),
    atendimentos: atendimentos.map((a) => {
      const visivel = podeVerRegistro(ator, a);
      return {
        id: a.id,
        criadoEm: a.criadoEm,
        realizadoEm: a.realizadoEm,
        tipo: a.tipo,
        sigilo: a.sigilo,
        especialidade: a.especialidade,
        unidade: mapas.unidade(a.unidadeId),
        profissional: mapas.pessoa(a.profissionalId),
        visivel,
        texto: visivel ? decifrar(a.textoCifrado) : null,
        retificaId: a.retificaId,
        motivoRetificacao: visivel ? a.motivoRetificacao : null,
        retificadoPor: atendimentosRetificados.get(a.id) ?? null,
      };
    }),
    avaliacoes: avaliacoes.map((v) => ({
      id: v.id,
      criadoEm: v.criadoEm,
      unidade: mapas.unidade(v.unidadeId),
      profissional: mapas.pessoa(v.profissionalId),
      fatoresGraves: v.fatoresGraves,
      sugestao: v.sugestao,
      classificacao: v.classificacao,
      visivel: tecnica,
      respostas: tecnica ? (JSON.parse(decifrar(v.respostasCifrado)) as Respostas) : null,
      justificativa: tecnica ? decifrarOpcional(v.justificativaCifrado) : null,
    })),
    encaminhamentos: encaminhamentos.map((e) => ({
      id: e.id,
      criadoEm: e.criadoEm,
      status: e.status,
      urgencia: e.urgencia,
      origem: mapas.unidade(e.origemUnidadeId),
      destino: e.destinoUnidadeId ? mapas.unidade(e.destinoUnidadeId) : null,
      destinoUnidadeId: e.destinoUnidadeId,
      destinoExterno: e.destinoExterno,
      criadoPor: mapas.pessoa(e.criadoPorId),
      recebidoPor: e.recebidoPorId ? mapas.pessoa(e.recebidoPorId) : null,
      recebidoEm: e.recebidoEm,
      concluidoEm: e.concluidoEm,
      motivo: tecnica ? decifrar(e.motivoCifrado) : null,
      resposta: tecnica ? decifrarOpcional(e.respostaCifrado) : null,
    })),
    medidas: medidas.map((m) => ({
      id: m.id,
      criadoEm: m.criadoEm,
      atualizadoEm: m.atualizadoEm,
      numeroProcesso: m.numeroProcesso,
      medidas: m.medidas,
      status: m.status,
      solicitadaEm: m.solicitadaEm,
      decididaEm: m.decididaEm,
      validaAte: m.validaAte,
      unidade: mapas.unidade(m.unidadeId),
      registradoPor: mapas.pessoa(m.registradoPorId),
      observacoes: tecnica ? decifrarOpcional(m.observacoesCifrado) : null,
    })),
    autores: autores.map((a) => ({
      id: a.id,
      criadoEm: a.criadoEm,
      nome: decifrar(a.nomeCifrado),
      vinculo: a.vinculo,
      acessoArma: a.acessoArma,
      observacoes: tecnica ? decifrarOpcional(a.observacoesCifrado) : null,
      unidade: mapas.unidade(a.unidadeId),
    })),
  };
}

export type ConteudoProntuario = ReturnType<typeof montarConteudo>;

/** Eventos de auditoria de um prontuário (aba "Acessos", só gestão). */
export async function acessosAoProntuario(prontuarioId: string) {
  return db
    .select({
      id: schema.auditoria.id,
      acao: schema.auditoria.acao,
      criadoEm: schema.auditoria.criadoEm,
      usuarioId: schema.auditoria.usuarioId,
      unidadeId: schema.auditoria.unidadeId,
      detalhes: schema.auditoria.detalhes,
    })
    .from(schema.auditoria)
    .where(eq(schema.auditoria.prontuarioId, prontuarioId))
    .orderBy(desc(schema.auditoria.criadoEm))
    .limit(300);
}

/** Quais prontuários (entre os ids dados) a unidade pode abrir agora. */
export async function prontuariosAcessiveis(unidadeId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const linhas = await db
    .select()
    .from(schema.acessos)
    .where(and(eq(schema.acessos.unidadeId, unidadeId), inArray(schema.acessos.prontuarioId, ids)));
  return new Set(linhas.filter((c) => concessaoVigente(c as Concessao)).map((c) => c.prontuarioId));
}
