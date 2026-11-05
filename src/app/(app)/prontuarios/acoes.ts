"use server";

/**
 * Server actions do prontuário. TODA ação:
 *  1. identifica a usuária (exigirUsuario),
 *  2. confere a permissão no servidor (nunca confiar na interface),
 *  3. grava na trilha de auditoria.
 */
import { and, eq, ilike, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  NIVEIS_RISCO,
  SIGILOS,
  STATUS_MEDIDA,
  TIPOS_ATENDIMENTO,
  TIPOS_VIOLENCIA,
  URGENCIAS,
  VINCULOS_AUTOR,
} from "@/db/schema";
import { apenasDigitos, cifrar, cifrarOpcional, indiceCego } from "@/lib/cripto";
import { registrarAuditoria } from "@/lib/auditoria";
import { falha, falhaValidacao, lerFormulario, sucesso, type EstadoAcao } from "@/lib/estado-acao";
import { avaliarFonar, limparRespostas } from "@/lib/fonar";
import {
  DURACAO_ACESSO_EMERGENCIAL_MS,
  concessaoVigente,
  podeAbrirProntuario,
  podeAlterarConsentimento,
  podeCadastrar,
  podeRegistrarAtendimento,
  podeRevisarAcessoEmergencial,
  podeSolicitarAcessoEmergencial,
  sigilosPermitidos,
  type Concessao,
} from "@/lib/permissoes";
import { exigirUsuario, type UsuarioLogado } from "@/lib/sessao";
import { cpfValido, hojeISO, normalizarBusca } from "@/lib/texto";
import { concessoesDoProntuario, ehUuid } from "@/lib/dados/prontuario";

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const quem = (u: UsuarioLogado) => ({ usuarioId: u.id, unidadeId: u.unidadeId });
const opcional = (max = 300) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.");

async function prontuarioComAcesso(usuario: UsuarioLogado, prontuarioId: string) {
  if (!ehUuid(prontuarioId)) return null;
  const [p] = await db.select().from(schema.prontuarios).where(eq(schema.prontuarios.id, prontuarioId)).limit(1);
  if (!p) return null;
  const concessoes = await concessoesDoProntuario(prontuarioId);
  if (!podeAbrirProntuario(usuario, concessoes as Concessao[])) return null;
  return p;
}

const SEM_ACESSO = "Sua unidade não tem acesso a este prontuário.";
const SO_EQUIPE_TECNICA = "Somente a equipe técnica pode fazer este registro.";

function tocarProntuario(id: string) {
  return db.update(schema.prontuarios).set({ atualizadoEm: new Date() }).where(eq(schema.prontuarios.id, id));
}

// ---------------------------------------------------------------------------
// Cadastro / acolhimento
// ---------------------------------------------------------------------------

const inteiroOpcional = (oque: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 20), `Número de ${oque} inválido.`);
const simNaoOpcional = z
  .string()
  .optional()
  .transform((v) => (v === "sim" ? true : v === "nao" ? false : null));

const esquemaCadastro = z.object({
  nomeCivil: z.string().trim().min(3, "Informe o nome completo.").max(160),
  nomeSocial: opcional(160),
  dataNascimento: dataOpcional.refine((v) => v === null || v <= hojeISO(), "Data no futuro."),
  cpf: z
    .string()
    .optional()
    .transform((v) => (v ? apenasDigitos(v) : ""))
    .refine((v) => v === "" || cpfValido(v), "CPF inválido."),
  identidadeGenero: opcional(60),
  racaCor: opcional(40),
  escolaridade: opcional(60),
  ocupacao: opcional(120),
  telefone: opcional(40),
  contatoSeguro: z.string().optional().transform((v) => v !== "nao"),
  podeDeixarRecado: z.string().optional().transform((v) => v === "on"),
  melhorHorario: opcional(120),
  orientacoesContato: opcional(1000),
  endereco: opcional(300),
  bairro: opcional(80),
  quantidadeFilhos: inteiroOpcional("filhos"),
  filhosMenores: inteiroOpcional("filhos menores"),
  gestante: simNaoOpcional,
  pessoaComDeficiencia: simNaoOpcional,
  estadoCivil: opcional(60),
  situacaoTrabalho: opcional(60),
  rendaFamiliar: opcional(60),
  recebeBeneficio: simNaoOpcional,
  situacaoMoradia: opcional(60),
  dependenciaFinanceira: simNaoOpcional,
}).refine((d) => d.filhosMenores === null || d.quantidadeFilhos === null || d.filhosMenores <= d.quantidadeFilhos, {
  message: "Não pode ser maior que o total de filhos.",
  path: ["filhosMenores"],
});

function valoresCadastro(d: z.infer<typeof esquemaCadastro>) {
  return {
    nomeCivil: d.nomeCivil,
    nomeSocial: d.nomeSocial,
    nomeBusca: normalizarBusca(`${d.nomeCivil} ${d.nomeSocial ?? ""}`),
    dataNascimento: d.dataNascimento,
    cpfCifrado: d.cpf ? cifrar(d.cpf) : null,
    cpfIndice: d.cpf ? indiceCego(d.cpf) : null,
    identidadeGenero: d.identidadeGenero,
    racaCor: d.racaCor,
    escolaridade: d.escolaridade,
    ocupacao: d.ocupacao,
    telefoneCifrado: cifrarOpcional(d.telefone),
    contatoSeguro: d.contatoSeguro,
    podeDeixarRecado: d.podeDeixarRecado,
    melhorHorario: d.melhorHorario,
    orientacoesContatoCifrado: cifrarOpcional(d.orientacoesContato),
    enderecoCifrado: cifrarOpcional(d.endereco),
    bairro: d.bairro,
    quantidadeFilhos: d.quantidadeFilhos,
    filhosMenores: d.filhosMenores,
    gestante: d.gestante,
    pessoaComDeficiencia: d.pessoaComDeficiencia,
    estadoCivil: d.estadoCivil,
    situacaoTrabalho: d.situacaoTrabalho,
    rendaFamiliar: d.rendaFamiliar,
    recebeBeneficio: d.recebeBeneficio,
    situacaoMoradia: d.situacaoMoradia,
    dependenciaFinanceira: d.dependenciaFinanceira,
  };
}

const esquemaRelatoInicial = z.object({
  relatoTexto: z.string().trim().max(20000).optional(),
  relatoDataFato: dataOpcional,
  relatoTipos: z.array(z.enum(TIPOS_VIOLENCIA)).default([]),
});

export type Duplicada = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  motivo: string;
};

export async function criarProntuario(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeCadastrar(usuario)) return falha("Seu perfil não pode abrir prontuários.");

  const bruto = lerFormulario(dados, ["relatoTipos"]);
  const cad = esquemaCadastro.safeParse(bruto);
  if (!cad.success) return falhaValidacao(cad.error);
  const rel = esquemaRelatoInicial.safeParse(bruto);
  if (!rel.success) return falhaValidacao(rel.error);
  const autorizou = bruto.compartilhamento === "sim";

  // 1) Checagem de duplicidade — o objetivo é UM prontuário por mulher.
  if (bruto.confirmarNovo !== "sim") {
    const d = cad.data;
    const candidatas = new Map<string, Duplicada>();
    if (d.cpf) {
      const r = await db.select().from(schema.prontuarios).where(eq(schema.prontuarios.cpfIndice, indiceCego(d.cpf)));
      r.forEach((p) => candidatas.set(p.id, { id: p.id, nome: p.nomeSocial || p.nomeCivil, dataNascimento: p.dataNascimento, motivo: "mesmo CPF" }));
    }
    const nomes = [normalizarBusca(d.nomeCivil), d.nomeSocial ? normalizarBusca(d.nomeSocial) : null].filter(Boolean) as string[];
    const primeiroNome = normalizarBusca(d.nomeSocial || d.nomeCivil).split(" ")[0] ?? "";
    const porNome = await db
      .select()
      .from(schema.prontuarios)
      .where(
        d.dataNascimento
          ? eq(schema.prontuarios.dataNascimento, d.dataNascimento)
          : ilike(schema.prontuarios.nomeBusca, `%${primeiroNome.replace(/[\\%_]/g, "")}%`),
      )
      .limit(200);
    for (const p of porNome) {
      if (candidatas.has(p.id)) continue;
      const alvo = normalizarBusca(`${p.nomeCivil} ${p.nomeSocial ?? ""}`);
      const pNomes = [normalizarBusca(p.nomeCivil), p.nomeSocial ? normalizarBusca(p.nomeSocial) : null].filter(Boolean) as string[];
      const mesmoNome = nomes.some((n) => pNomes.includes(n)) || nomes.some((n) => n.length > 8 && alvo.includes(n));
      if (mesmoNome) {
        candidatas.set(p.id, {
          id: p.id,
          nome: p.nomeSocial || p.nomeCivil,
          dataNascimento: p.dataNascimento,
          motivo: d.dataNascimento ? "mesmo nome e data de nascimento" : "mesmo nome",
        });
      }
    }
    if (candidatas.size > 0) {
      return {
        ...falha("Encontramos prontuário(s) parecido(s) na rede. Confira antes de criar outro."),
        dados: { duplicadas: [...candidatas.values()].slice(0, 5) },
      };
    }
  }

  const tecnica = podeRegistrarAtendimento(usuario);
  const textoRelato = tecnica ? rel.data.relatoTexto?.trim() : undefined;

  const id = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(schema.prontuarios)
      .values({
        ...valoresCadastro(cad.data),
        compartilhamentoAutorizado: autorizou,
        consentimentoRegistradoEm: new Date(),
        consentimentoRegistradoPorId: usuario.id,
        unidadeOrigemId: usuario.unidadeId,
        criadoPorId: usuario.id,
      })
      .returning({ id: schema.prontuarios.id });

    await tx.insert(schema.acessos).values({
      prontuarioId: p.id,
      unidadeId: usuario.unidadeId,
      origem: "ORIGEM",
      concedidoPorId: usuario.id,
    });

    if (textoRelato) {
      await tx.insert(schema.relatos).values({
        prontuarioId: p.id,
        unidadeId: usuario.unidadeId,
        autorId: usuario.id,
        especialidade: usuario.especialidade,
        dataFato: rel.data.relatoDataFato,
        tiposViolencia: rel.data.relatoTipos,
        textoCifrado: cifrar(textoRelato),
        sigilo: "REDE",
      });
    }

    await registrarAuditoria(
      "PRONTUARIO_CRIADO",
      quem(usuario),
      { prontuarioId: p.id, detalhes: { compartilhamentoAutorizado: autorizou, comRelato: !!textoRelato } },
      tx,
    );
    return p.id;
  });

  redirect(`/prontuarios/${id}?novo=1`);
}

export async function atualizarCadastro(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeCadastrar(usuario)) return falha("Seu perfil não pode alterar cadastros.");
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const cad = esquemaCadastro.safeParse(lerFormulario(dados));
  if (!cad.success) return falhaValidacao(cad.error);

  // O formulário de edição vem preenchido; campo apagado significa remover o dado.
  const novos = valoresCadastro(cad.data);
  const alterados = (Object.keys(novos) as (keyof typeof novos)[]).filter((k) => {
    if (k === "cpfCifrado" || k === "telefoneCifrado" || k === "orientacoesContatoCifrado" || k === "enderecoCifrado") {
      // valores cifrados mudam a cada gravação; compara pelo índice/presença
      return false;
    }
    return (p[k] ?? null) !== (novos[k] ?? null);
  });
  if ((p.cpfIndice ?? null) !== (novos.cpfIndice ?? null)) alterados.push("cpfCifrado");

  await db
    .update(schema.prontuarios)
    .set({ ...novos, atualizadoEm: new Date() })
    .where(eq(schema.prontuarios.id, prontuarioId));
  await registrarAuditoria("CADASTRO_ALTERADO", quem(usuario), {
    prontuarioId,
    detalhes: { campos: alterados.filter((c) => c !== "nomeBusca") },
  });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso("Dados cadastrais atualizados.");
}

export async function alterarConsentimento(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeAlterarConsentimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);
  const autorizou = dados.get("compartilhamento") === "sim";

  await db
    .update(schema.prontuarios)
    .set({
      compartilhamentoAutorizado: autorizou,
      consentimentoRegistradoEm: new Date(),
      consentimentoRegistradoPorId: usuario.id,
      atualizadoEm: new Date(),
    })
    .where(eq(schema.prontuarios.id, prontuarioId));
  await registrarAuditoria("CONSENTIMENTO_ALTERADO", quem(usuario), {
    prontuarioId,
    detalhes: { de: p.compartilhamentoAutorizado, para: autorizou },
  });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso(autorizou ? "Autorização de compartilhamento registrada." : "Compartilhamento com a rede revogado.");
}

export async function alterarStatusProntuario(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "GESTORA") return falha("Somente a gestão pode arquivar ou reativar prontuários.");
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);
  const novo = dados.get("status") === "ARQUIVADO" ? "ARQUIVADO" : "ATIVO";
  await db.update(schema.prontuarios).set({ status: novo, atualizadoEm: new Date() }).where(eq(schema.prontuarios.id, prontuarioId));
  await registrarAuditoria(novo === "ARQUIVADO" ? "PRONTUARIO_ARQUIVADO" : "PRONTUARIO_REATIVADO", quem(usuario), { prontuarioId });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso(novo === "ARQUIVADO" ? "Prontuário arquivado." : "Prontuário reativado.");
}

// ---------------------------------------------------------------------------
// Acesso por quebra de vidro / autorização presencial
// ---------------------------------------------------------------------------

export async function solicitarAcesso(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeSolicitarAcessoEmergencial(usuario)) return falha(SO_EQUIPE_TECNICA);
  if (!ehUuid(prontuarioId)) return falha("Prontuário inválido.");

  const tipo = dados.get("tipo") === "AUTORIZACAO" ? "AUTORIZACAO" : "EMERGENCIAL";
  const justificativa = String(dados.get("justificativa") ?? "").trim().slice(0, 1000);
  if (justificativa.length < 15) return falha("Escreva uma justificativa (pelo menos 15 caracteres).", { justificativa: "Obrigatória." });
  if (dados.get("declaro") !== "on") return falha("Confirme a declaração para continuar.");

  const [p] = await db.select().from(schema.prontuarios).where(eq(schema.prontuarios.id, prontuarioId)).limit(1);
  if (!p) return falha("Prontuário não encontrado.");

  await db.insert(schema.acessos).values({
    prontuarioId,
    unidadeId: usuario.unidadeId,
    origem: tipo,
    justificativa,
    concedidoPorId: usuario.id,
    expiraEm: tipo === "EMERGENCIAL" ? new Date(Date.now() + DURACAO_ACESSO_EMERGENCIAL_MS) : null,
  });
  await registrarAuditoria("ACESSO_EMERGENCIAL", quem(usuario), {
    prontuarioId,
    detalhes: { tipo, justificativa, compartilhamentoAutorizado: p.compartilhamentoAutorizado },
  });
  redirect(`/prontuarios/${prontuarioId}`);
}

export async function revisarAcesso(acessoId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!ehUuid(acessoId)) return falha("Acesso inválido.");
  const [a] = await db.select().from(schema.acessos).where(eq(schema.acessos.id, acessoId)).limit(1);
  if (!a) return falha("Acesso não encontrado.");
  const [p] = await db.select().from(schema.prontuarios).where(eq(schema.prontuarios.id, a.prontuarioId)).limit(1);
  if (!p || !podeRevisarAcessoEmergencial(usuario, p.unidadeOrigemId)) {
    return falha("Somente a gestão da unidade que abriu o prontuário pode revisar acessos.");
  }
  if (a.origem === "ORIGEM") return falha("O acesso da unidade de origem não pode ser revogado.");

  const revogar = dados.get("decisao") === "revogar";
  await db
    .update(schema.acessos)
    .set({ revisadoPorId: usuario.id, revisadoEm: new Date(), ...(revogar ? { revogadoEm: new Date() } : {}) })
    .where(eq(schema.acessos.id, acessoId));
  await registrarAuditoria(revogar ? "ACESSO_REVOGADO" : "ACESSO_EMERGENCIAL_REVISADO", quem(usuario), {
    prontuarioId: a.prontuarioId,
    alvo: `acesso:${acessoId}`,
    detalhes: { unidadeDoAcesso: a.unidadeId, origem: a.origem },
  });
  revalidatePath("/auditoria");
  revalidatePath(`/prontuarios/${a.prontuarioId}`);
  return sucesso(revogar ? "Acesso revogado." : "Acesso marcado como revisado.");
}

// ---------------------------------------------------------------------------
// Registros técnicos (somente acréscimo)
// ---------------------------------------------------------------------------

const esquemaSigilo = z.enum(SIGILOS).default("REDE");

const esquemaRelato = z.object({
  texto: z.string().trim().min(10, "Escreva o relato.").max(20000),
  dataFato: dataOpcional,
  localFato: opcional(300),
  tiposViolencia: z.array(z.enum(TIPOS_VIOLENCIA)).default([]),
  sigilo: esquemaSigilo,
});

export async function registrarRelato(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const r = esquemaRelato.safeParse(lerFormulario(dados, ["tiposViolencia"]));
  if (!r.success) return falhaValidacao(r.error);
  if (!sigilosPermitidos(usuario).includes(r.data.sigilo)) return falha("Nível de sigilo indisponível para seu perfil.");

  const [novo] = await db
    .insert(schema.relatos)
    .values({
      prontuarioId,
      unidadeId: usuario.unidadeId,
      autorId: usuario.id,
      especialidade: usuario.especialidade,
      dataFato: r.data.dataFato,
      localFatoCifrado: cifrarOpcional(r.data.localFato),
      tiposViolencia: r.data.tiposViolencia,
      textoCifrado: cifrar(r.data.texto),
      sigilo: r.data.sigilo,
    })
    .returning({ id: schema.relatos.id });
  await tocarProntuario(prontuarioId);
  await registrarAuditoria("RELATO_REGISTRADO", quem(usuario), {
    prontuarioId,
    alvo: `relato:${novo.id}`,
    detalhes: { sigilo: r.data.sigilo, tipos: r.data.tiposViolencia },
  });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso("Relato registrado. A partir de agora ele está disponível para as unidades com acesso.");
}

const esquemaAtendimento = z.object({
  tipo: z.enum(TIPOS_ATENDIMENTO),
  realizadoEm: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Data/hora inválida.")
    .transform((v) => new Date(v))
    .refine((d) => d.getTime() <= Date.now() + 5 * 60000, "Não registre atendimentos no futuro."),
  texto: z.string().trim().min(5, "Descreva o atendimento.").max(20000),
  sigilo: esquemaSigilo,
});

export async function registrarAtendimento(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const bruto = lerFormulario(dados);
  // datetime-local chega sem fuso: interpretamos como horário de Brasília.
  if (typeof bruto.realizadoEm === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(bruto.realizadoEm)) {
    bruto.realizadoEm = `${bruto.realizadoEm}:00-03:00`;
  }
  const r = esquemaAtendimento.safeParse(bruto);
  if (!r.success) return falhaValidacao(r.error);
  if (!sigilosPermitidos(usuario).includes(r.data.sigilo)) return falha("Nível de sigilo indisponível para seu perfil.");

  const [novo] = await db
    .insert(schema.atendimentos)
    .values({
      prontuarioId,
      unidadeId: usuario.unidadeId,
      profissionalId: usuario.id,
      especialidade: usuario.especialidade,
      tipo: r.data.tipo,
      realizadoEm: r.data.realizadoEm,
      textoCifrado: cifrar(r.data.texto),
      sigilo: r.data.sigilo,
    })
    .returning({ id: schema.atendimentos.id });
  await tocarProntuario(prontuarioId);
  await registrarAuditoria("ATENDIMENTO_REGISTRADO", quem(usuario), {
    prontuarioId,
    alvo: `atendimento:${novo.id}`,
    detalhes: { tipo: r.data.tipo, sigilo: r.data.sigilo },
  });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso("Atendimento registrado.");
}

export async function registrarRetificacao(
  alvo: { tipo: "relato" | "atendimento"; id: string },
  _: EstadoAcao,
  dados: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  if (!ehUuid(alvo.id)) return falha("Registro inválido.");
  const texto = String(dados.get("texto") ?? "").trim().slice(0, 20000);
  const motivo = String(dados.get("motivo") ?? "").trim().slice(0, 500);
  if (texto.length < 5) return falha("Escreva o texto corrigido.", { texto: "Obrigatório." });
  if (motivo.length < 5) return falha("Explique o motivo da retificação.", { motivo: "Obrigatório." });

  const tabela = alvo.tipo === "relato" ? schema.relatos : schema.atendimentos;
  const [original] = await db.select().from(tabela).where(eq(tabela.id, alvo.id)).limit(1);
  if (!original) return falha("Registro não encontrado.");
  const autorOriginal = "autorId" in original ? original.autorId : original.profissionalId;
  if (autorOriginal !== usuario.id) return falha("Só quem fez o registro pode retificá-lo.");
  const p = await prontuarioComAcesso(usuario, original.prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  let novoId: string;
  if (alvo.tipo === "relato" && "autorId" in original) {
    const [n] = await db
      .insert(schema.relatos)
      .values({
        prontuarioId: original.prontuarioId,
        unidadeId: usuario.unidadeId,
        autorId: usuario.id,
        especialidade: usuario.especialidade,
        dataFato: original.dataFato,
        localFatoCifrado: original.localFatoCifrado,
        tiposViolencia: original.tiposViolencia,
        textoCifrado: cifrar(texto),
        sigilo: original.sigilo,
        retificaId: original.id,
        motivoRetificacao: motivo,
      })
      .returning({ id: schema.relatos.id });
    novoId = n.id;
  } else if ("profissionalId" in original) {
    const [n] = await db
      .insert(schema.atendimentos)
      .values({
        prontuarioId: original.prontuarioId,
        unidadeId: usuario.unidadeId,
        profissionalId: usuario.id,
        especialidade: usuario.especialidade,
        tipo: original.tipo,
        realizadoEm: original.realizadoEm,
        textoCifrado: cifrar(texto),
        sigilo: original.sigilo,
        retificaId: original.id,
        motivoRetificacao: motivo,
      })
      .returning({ id: schema.atendimentos.id });
    novoId = n.id;
  } else {
    return falha("Registro inválido.");
  }

  await registrarAuditoria("RETIFICACAO", quem(usuario), {
    prontuarioId: original.prontuarioId,
    alvo: `${alvo.tipo}:${original.id}`,
    detalhes: { novo: novoId },
  });
  revalidatePath(`/prontuarios/${original.prontuarioId}`);
  return sucesso("Retificação registrada. O texto original continua guardado, marcado como retificado.");
}

// ---------------------------------------------------------------------------
// Avaliação de risco (FONAR)
// ---------------------------------------------------------------------------

export async function registrarAvaliacaoRisco(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const entrada: Record<string, string[]> = {};
  for (const [chave, valor] of dados.entries()) {
    if (!/^q\d+(_\d+)?$/.test(chave) || typeof valor !== "string") continue;
    (entrada[chave] ??= []).push(valor);
  }
  const respostas = limparRespostas(entrada);
  const resultado = avaliarFonar(respostas);
  if (resultado.respondidas < 10) return falha("Responda pelo menos 10 perguntas do formulário (pode marcar \"Não sei\").");

  const classificacao = z.enum(NIVEIS_RISCO).exclude(["NAO_AVALIADO"]).safeParse(dados.get("classificacao"));
  if (!classificacao.success) return falha("Escolha a classificação de risco (Parte II).", { classificacao: "Obrigatória." });
  const justificativa = String(dados.get("justificativa") ?? "").trim().slice(0, 5000);
  if (classificacao.data !== resultado.sugestao && justificativa.length < 10) {
    return falha("A classificação é diferente da sugestão: registre a justificativa técnica.", {
      justificativa: "Obrigatória quando diverge da sugestão.",
    });
  }

  await db.transaction(async (tx) => {
    const [n] = await tx
      .insert(schema.avaliacoesRisco)
      .values({
        prontuarioId,
        unidadeId: usuario.unidadeId,
        profissionalId: usuario.id,
        respostasCifrado: cifrar(JSON.stringify(respostas)),
        fatoresGraves: resultado.fatoresGraves.length,
        sugestao: resultado.sugestao,
        classificacao: classificacao.data,
        justificativaCifrado: cifrarOpcional(justificativa),
      })
      .returning({ id: schema.avaliacoesRisco.id });
    await tx
      .update(schema.prontuarios)
      .set({ nivelRisco: classificacao.data, riscoAtualizadoEm: new Date(), atualizadoEm: new Date() })
      .where(eq(schema.prontuarios.id, prontuarioId));
    await registrarAuditoria(
      "AVALIACAO_RISCO",
      quem(usuario),
      { prontuarioId, alvo: `avaliacao:${n.id}`, detalhes: { classificacao: classificacao.data, sugestao: resultado.sugestao } },
      tx,
    );
  });

  revalidatePath(`/prontuarios/${prontuarioId}`);
  redirect(`/prontuarios/${prontuarioId}?aba=risco`);
}

// ---------------------------------------------------------------------------
// Autor da violência e medidas protetivas
// ---------------------------------------------------------------------------

const esquemaAutor = z.object({
  nome: z.string().trim().min(2, "Informe o nome ou apelido.").max(160),
  vinculo: z.enum(VINCULOS_AUTOR),
  acessoArma: z.enum(["SIM", "NAO", "NAO_SABE"]).default("NAO_SABE"),
  observacoes: opcional(2000),
});

export async function registrarAutor(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);
  const r = esquemaAutor.safeParse(lerFormulario(dados));
  if (!r.success) return falhaValidacao(r.error);

  await db.insert(schema.autores).values({
    prontuarioId,
    nomeCifrado: cifrar(r.data.nome),
    vinculo: r.data.vinculo,
    acessoArma: r.data.acessoArma,
    observacoesCifrado: cifrarOpcional(r.data.observacoes),
    unidadeId: usuario.unidadeId,
    criadoPorId: usuario.id,
  });
  await tocarProntuario(prontuarioId);
  await registrarAuditoria("AUTOR_REGISTRADO", quem(usuario), { prontuarioId, detalhes: { vinculo: r.data.vinculo } });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso("Autor da violência registrado.");
}

const esquemaMedida = z.object({
  numeroProcesso: opcional(60),
  medidas: z.array(z.string().trim().min(1).max(200)).min(1, "Marque ao menos uma medida."),
  status: z.enum(STATUS_MEDIDA),
  solicitadaEm: dataOpcional,
  decididaEm: dataOpcional,
  validaAte: dataOpcional,
  observacoes: opcional(2000),
});

export async function registrarMedida(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const bruto = lerFormulario(dados, ["medidas"]);
  const outra = typeof bruto.medidaOutra === "string" ? bruto.medidaOutra.trim() : "";
  if (outra) (bruto.medidas as string[]).push(outra);
  const r = esquemaMedida.safeParse(bruto);
  if (!r.success) return falhaValidacao(r.error);

  await db.insert(schema.medidasProtetivas).values({
    prontuarioId,
    numeroProcesso: r.data.numeroProcesso,
    medidas: r.data.medidas,
    status: r.data.status,
    solicitadaEm: r.data.solicitadaEm,
    decididaEm: r.data.decididaEm,
    validaAte: r.data.validaAte,
    observacoesCifrado: cifrarOpcional(r.data.observacoes),
    unidadeId: usuario.unidadeId,
    registradoPorId: usuario.id,
  });
  await tocarProntuario(prontuarioId);
  await registrarAuditoria("MEDIDA_REGISTRADA", quem(usuario), { prontuarioId, detalhes: { status: r.data.status } });
  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso("Medida protetiva registrada.");
}

export async function atualizarMedida(medidaId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  if (!ehUuid(medidaId)) return falha("Medida inválida.");
  const [m] = await db.select().from(schema.medidasProtetivas).where(eq(schema.medidasProtetivas.id, medidaId)).limit(1);
  if (!m) return falha("Medida não encontrada.");
  const p = await prontuarioComAcesso(usuario, m.prontuarioId);
  if (!p) return falha(SEM_ACESSO);

  const status = z.enum(STATUS_MEDIDA).safeParse(dados.get("status"));
  if (!status.success) return falha("Status inválido.");
  const validaAte = dataOpcional.safeParse(dados.get("validaAte") ?? undefined);
  if (!validaAte.success) return falha("Data inválida.");
  const numeroProcesso = String(dados.get("numeroProcesso") ?? "").trim().slice(0, 60) || m.numeroProcesso;

  await db
    .update(schema.medidasProtetivas)
    .set({
      status: status.data,
      validaAte: validaAte.data ?? m.validaAte,
      numeroProcesso,
      decididaEm: status.data !== "SOLICITADA" && !m.decididaEm ? hojeISO() : m.decididaEm,
      atualizadoEm: new Date(),
    })
    .where(eq(schema.medidasProtetivas.id, medidaId));
  await registrarAuditoria("MEDIDA_ATUALIZADA", quem(usuario), {
    prontuarioId: m.prontuarioId,
    alvo: `medida:${medidaId}`,
    detalhes: { de: m.status, para: status.data },
  });
  revalidatePath(`/prontuarios/${m.prontuarioId}`);
  return sucesso("Medida atualizada.");
}

// ---------------------------------------------------------------------------
// Encaminhamentos
// ---------------------------------------------------------------------------

const esquemaEncaminhamento = z
  .object({
    destinoUnidadeId: z.string().optional().transform((v) => (v && v !== "externo" ? v : null)),
    destinoExterno: opcional(200),
    motivo: z.string().trim().min(20, "Escreva a ficha de passagem (pelo menos 20 caracteres).").max(10000),
    urgencia: z.enum(URGENCIAS),
  })
  .refine((d) => d.destinoUnidadeId || d.destinoExterno, { message: "Escolha o destino.", path: ["destinoUnidadeId"] });

export async function criarEncaminhamento(prontuarioId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!podeRegistrarAtendimento(usuario)) return falha(SO_EQUIPE_TECNICA);
  const p = await prontuarioComAcesso(usuario, prontuarioId);
  if (!p) return falha(SEM_ACESSO);
  if (p.status === "ARQUIVADO") return falha("Reative o prontuário antes de encaminhar.");

  const r = esquemaEncaminhamento.safeParse(lerFormulario(dados));
  if (!r.success) return falhaValidacao(r.error);
  const { destinoUnidadeId, destinoExterno, motivo, urgencia } = r.data;

  if (destinoUnidadeId) {
    if (!ehUuid(destinoUnidadeId)) return falha("Unidade inválida.");
    if (destinoUnidadeId === usuario.unidadeId) return falha("Escolha uma unidade diferente da sua.");
    const [u] = await db.select().from(schema.unidades).where(eq(schema.unidades.id, destinoUnidadeId)).limit(1);
    if (!u?.ativa) return falha("Unidade de destino indisponível.");
    const aberto = await db
      .select({ id: schema.encaminhamentos.id })
      .from(schema.encaminhamentos)
      .where(
        and(
          eq(schema.encaminhamentos.prontuarioId, prontuarioId),
          eq(schema.encaminhamentos.destinoUnidadeId, destinoUnidadeId),
          inArray(schema.encaminhamentos.status, ["ENVIADO", "RECEBIDO"]),
        ),
      )
      .limit(1);
    if (aberto.length) return falha("Já existe um encaminhamento em aberto para essa unidade.");
  }

  // A unidade de destino só passa a ver o prontuário se ela autorizou.
  const compartilhar = !!destinoUnidadeId && (p.compartilhamentoAutorizado || dados.get("autorizouDestino") === "on");

  await db.transaction(async (tx) => {
    const [e] = await tx
      .insert(schema.encaminhamentos)
      .values({
        prontuarioId,
        origemUnidadeId: usuario.unidadeId,
        destinoUnidadeId,
        destinoExterno: destinoUnidadeId ? null : destinoExterno,
        criadoPorId: usuario.id,
        motivoCifrado: cifrar(motivo),
        urgencia,
        status: destinoUnidadeId ? "ENVIADO" : "CONCLUIDO",
        concluidoEm: destinoUnidadeId ? null : new Date(),
      })
      .returning({ id: schema.encaminhamentos.id });

    if (compartilhar && destinoUnidadeId) {
      const existentes = await tx
        .select()
        .from(schema.acessos)
        .where(and(eq(schema.acessos.prontuarioId, prontuarioId), eq(schema.acessos.unidadeId, destinoUnidadeId)));
      const jaTemPermanente = existentes.some((c) => concessaoVigente(c as Concessao) && c.origem !== "EMERGENCIAL");
      if (!jaTemPermanente) {
        await tx.insert(schema.acessos).values({
          prontuarioId,
          unidadeId: destinoUnidadeId,
          origem: "ENCAMINHAMENTO",
          concedidoPorId: usuario.id,
          justificativa: `Encaminhamento ${e.id}`,
        });
      }
    }
    await tx.update(schema.prontuarios).set({ atualizadoEm: new Date() }).where(eq(schema.prontuarios.id, prontuarioId));
    await registrarAuditoria(
      "ENCAMINHAMENTO_CRIADO",
      quem(usuario),
      {
        prontuarioId,
        alvo: `encaminhamento:${e.id}`,
        detalhes: { destino: destinoUnidadeId ?? "externo", urgencia, compartilhouProntuario: compartilhar },
      },
      tx,
    );
  });

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso(
    destinoUnidadeId
      ? compartilhar
        ? "Encaminhamento enviado. A unidade de destino já pode ler o histórico — ela não vai precisar contar tudo de novo."
        : "Encaminhamento enviado. Como não houve autorização, a unidade de destino verá só a ficha de passagem."
      : "Encaminhamento externo registrado.",
  );
}

export async function atualizarEncaminhamento(encaminhamentoId: string, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (!ehUuid(encaminhamentoId)) return falha("Encaminhamento inválido.");
  const [e] = await db.select().from(schema.encaminhamentos).where(eq(schema.encaminhamentos.id, encaminhamentoId)).limit(1);
  if (!e) return falha("Encaminhamento não encontrado.");

  const operacao = String(dados.get("operacao") ?? "");
  const resposta = String(dados.get("resposta") ?? "").trim().slice(0, 5000);
  const ehDestino = e.destinoUnidadeId === usuario.unidadeId;
  const ehOrigem = e.origemUnidadeId === usuario.unidadeId;
  const tecnica = podeRegistrarAtendimento(usuario);

  let mudanca: Partial<typeof schema.encaminhamentos.$inferInsert>;
  let acao: "ENCAMINHAMENTO_RECEBIDO" | "ENCAMINHAMENTO_CONCLUIDO" | "ENCAMINHAMENTO_RECUSADO" | "ENCAMINHAMENTO_CANCELADO";
  let mensagem: string;

  switch (operacao) {
    case "receber":
      if (!ehDestino || e.status !== "ENVIADO") return falha("Este encaminhamento não está aguardando sua unidade.");
      mudanca = { status: "RECEBIDO", recebidoPorId: usuario.id, recebidoEm: new Date() };
      acao = "ENCAMINHAMENTO_RECEBIDO";
      mensagem = "Recebimento confirmado. A unidade de origem verá que ela chegou.";
      break;
    case "concluir":
      if (!ehDestino || !tecnica || !["ENVIADO", "RECEBIDO"].includes(e.status)) return falha("Não é possível concluir.");
      mudanca = {
        status: "CONCLUIDO",
        concluidoEm: new Date(),
        respostaCifrado: cifrarOpcional(resposta),
        recebidoPorId: e.recebidoPorId ?? usuario.id,
        recebidoEm: e.recebidoEm ?? new Date(),
      };
      acao = "ENCAMINHAMENTO_CONCLUIDO";
      mensagem = "Encaminhamento concluído.";
      break;
    case "recusar":
      if (!ehDestino || !tecnica || e.status !== "ENVIADO") return falha("Não é possível recusar.");
      if (resposta.length < 10) return falha("Explique o motivo para a unidade de origem.", { resposta: "Obrigatório." });
      mudanca = { status: "RECUSADO", respostaCifrado: cifrar(resposta), concluidoEm: new Date() };
      acao = "ENCAMINHAMENTO_RECUSADO";
      mensagem = "Encaminhamento devolvido à unidade de origem.";
      break;
    case "cancelar":
      if (!ehOrigem || !tecnica || !["ENVIADO", "RECEBIDO"].includes(e.status)) return falha("Não é possível cancelar.");
      mudanca = { status: "CANCELADO", concluidoEm: new Date(), respostaCifrado: cifrarOpcional(resposta) };
      acao = "ENCAMINHAMENTO_CANCELADO";
      mensagem = "Encaminhamento cancelado.";
      break;
    default:
      return falha("Operação inválida.");
  }

  await db
    .update(schema.encaminhamentos)
    .set({ ...mudanca, atualizadoEm: new Date() })
    .where(and(eq(schema.encaminhamentos.id, encaminhamentoId), ne(schema.encaminhamentos.status, "CANCELADO")));
  await registrarAuditoria(acao, quem(usuario), { prontuarioId: e.prontuarioId, alvo: `encaminhamento:${e.id}` });
  revalidatePath("/encaminhamentos");
  revalidatePath(`/prontuarios/${e.prontuarioId}`);
  return sucesso(mensagem);
}
