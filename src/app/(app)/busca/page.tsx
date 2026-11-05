import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { FileSearch, Lock, ShieldCheck, UserPlus } from "lucide-react";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { apenasDigitos, indiceCego } from "@/lib/cripto";
import { registrarAuditoria } from "@/lib/auditoria";
import { mapasRede, prontuariosAcessiveis } from "@/lib/dados/prontuario";
import { podeSolicitarAcessoEmergencial } from "@/lib/permissoes";
import { cpfValido, formatarData, idade, mascararCpf, normalizarBusca, numeroProntuario } from "@/lib/texto";
import { PREFIXO_PRONTUARIO } from "@/lib/config";
import { Aviso, BotaoLink, Cartao, Entrada, Selo, SeloUnidade, TituloPagina, Vazio, classeBotao } from "@/components/ui";
import { Avatar, SeloRisco } from "@/components/selos";
import { PedidoAcesso } from "./pedido-acesso";

export const metadata: Metadata = { title: "Buscar mulher" };

const escaparLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function PaginaBusca({ searchParams }: PageProps<"/busca">) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 120);
  const nasc = typeof params.nasc === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.nasc) ? params.nasc : "";

  const digitos = apenasDigitos(q);
  const porCpf = digitos.length === 11 && cpfValido(digitos) && digitos.length >= q.replace(/[\s.\-]/g, "").length;
  const termos = normalizarBusca(q).split(" ").filter((t) => t.length >= 2);
  const buscaValida = porCpf || termos.join("").length >= 3 || (!!nasc && termos.length > 0);
  const buscou = q.length > 0 || !!nasc;

  let resultados: schema.Prontuario[] = [];
  if (buscaValida) {
    const filtros: SQL[] = [];
    if (porCpf) filtros.push(eq(schema.prontuarios.cpfIndice, indiceCego(digitos)));
    else for (const t of termos) filtros.push(ilike(schema.prontuarios.nomeBusca, `%${escaparLike(t)}%`));
    if (nasc) filtros.push(eq(schema.prontuarios.dataNascimento, nasc));
    resultados = await db
      .select()
      .from(schema.prontuarios)
      .where(and(...filtros))
      .orderBy(desc(schema.prontuarios.atualizadoEm))
      .limit(30);

    await registrarAuditoria(
      "BUSCA",
      { usuarioId: usuario.id, unidadeId: usuario.unidadeId },
      { detalhes: { termo: porCpf ? mascararCpf(digitos) : q, nascimento: nasc || undefined, resultados: resultados.length } },
    );
  }

  const [mapas, acessiveis] = await Promise.all([
    mapasRede(),
    prontuariosAcessiveis(
      usuario.unidadeId,
      resultados.map((r) => r.id),
    ),
  ]);
  const podePedir = podeSolicitarAcessoEmergencial(usuario);
  const novoHref = `/prontuarios/novo?${new URLSearchParams({ ...(q && !porCpf ? { nome: q } : {}), ...(porCpf ? { cpf: digitos } : {}), ...(nasc ? { nasc } : {}) })}`;

  return (
    <div>
      <TituloPagina
        titulo="Buscar mulher na rede"
        descricao="A busca cobre todas as unidades. Se ela já foi atendida em algum ponto da rede, o prontuário aparece aqui — e ela não precisa contar tudo de novo."
      />

      <Cartao className="mb-6 p-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_auto]" role="search">
          <div>
            <label htmlFor="q" className="mb-1 block text-sm font-medium text-zinc-700">
              Nome, nome social ou CPF
            </label>
            <Entrada id="q" name="q" defaultValue={q} placeholder="Ex.: Maria Aparecida ou 123.456.789-09" autoFocus autoComplete="off" />
          </div>
          <div>
            <label htmlFor="nasc" className="mb-1 block text-sm font-medium text-zinc-700">
              Data de nascimento
            </label>
            <Entrada id="nasc" name="nasc" type="date" defaultValue={nasc} />
          </div>
          <div className="flex items-end">
            <button className={classeBotao("primario", "md", "w-full sm:w-auto")}>
              <FileSearch className="size-4" /> Buscar
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          Por privacidade, não existe lista completa de mulheres atendidas: é preciso buscar alguém específico. Toda busca fica registrada.
        </p>
      </Cartao>

      {buscou && !buscaValida && (
        <Aviso tom="atencao">Digite pelo menos 3 letras do nome, ou um CPF completo.</Aviso>
      )}

      {buscaValida && (
        <Cartao>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3">
            <p className="text-sm text-zinc-600">
              {resultados.length === 0
                ? "Nenhum prontuário encontrado."
                : `${resultados.length} prontuário${resultados.length > 1 ? "s" : ""} encontrado${resultados.length > 1 ? "s" : ""}`}
            </p>
            <BotaoLink href={novoHref} variante="secundario" tamanho="sm">
              <UserPlus className="size-4" /> <span className="sm:hidden">Novo acolhimento</span>
              <span className="hidden sm:inline">Não é nenhuma delas — novo acolhimento</span>
            </BotaoLink>
          </div>

          {resultados.length === 0 ? (
            <Vazio titulo="Ela ainda não tem prontuário na rede" icone={<FileSearch className="size-10" />}>
              Confira a grafia (ou tente pelo nome social). Se for mesmo o primeiro atendimento,{" "}
              <Link className="font-medium text-marca-700 underline" href={novoHref}>
                inicie um novo acolhimento
              </Link>
              .
            </Vazio>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {resultados.map((p) => {
                const temAcesso = acessiveis.has(p.id);
                const anos = idade(p.dataNascimento);
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <Avatar nome={p.nomeSocial || p.nomeCivil} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900">
                          {p.nomeSocial || p.nomeCivil}
                          {p.nomeSocial && <span className="ml-2 text-sm font-normal text-zinc-500">(registro civil: {p.nomeCivil})</span>}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span>Nasc. {formatarData(p.dataNascimento)}{anos !== null && ` (${anos} anos)`}</span>
                          <span>·</span>
                          <span>{numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            aberto em {formatarData(p.criadoEm)} por <SeloUnidade unidade={mapas.unidade(p.unidadeOrigemId)} />
                          </span>
                          {p.status === "ARQUIVADO" && <Selo>Arquivado</Selo>}
                        </p>
                      </div>
                      {temAcesso ? (
                        <div className="flex items-center gap-3">
                          <SeloRisco nivel={p.nivelRisco} />
                          <BotaoLink href={`/prontuarios/${p.id}`} tamanho="sm">
                            Abrir prontuário
                          </BotaoLink>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Lock className="size-3.5" /> Sua unidade ainda não tem acesso
                        </div>
                      )}
                    </div>
                    {!temAcesso && (
                      <div className="mt-3 sm:pl-13">
                        {p.compartilhamentoAutorizado ? (
                          <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-700">
                            <ShieldCheck className="size-3.5" /> Ela autorizou o compartilhamento do prontuário com a rede.
                          </p>
                        ) : (
                          <p className="mb-2 text-xs text-amber-800">
                            Ela não autorizou o compartilhamento com toda a rede. Peça autorização a ela, ou use o acesso emergencial só em caso de risco.
                          </p>
                        )}
                        {podePedir ? (
                          <PedidoAcesso prontuarioId={p.id} autorizado={p.compartilhamentoAutorizado} />
                        ) : (
                          <p className="text-xs text-zinc-500">Peça a uma profissional da equipe técnica para solicitar o acesso.</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      )}
    </div>
  );
}
