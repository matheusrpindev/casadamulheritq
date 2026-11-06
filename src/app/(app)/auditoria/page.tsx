import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { ShieldAlert, Siren } from "lucide-react";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { podeVerAuditoria } from "@/lib/permissoes";
import { mapasRede } from "@/lib/dados/prontuario";
import { ROTULO_ACAO, ROTULO_ORIGEM_ACESSO } from "@/lib/rotulos";
import { formatarDataHora, nomeExibicao, numeroProntuario } from "@/lib/texto";
import { PREFIXO_PRONTUARIO } from "@/lib/config";
import { CabecalhoCartao, Cartao, Entrada, Seletor, SeloUnidade, TituloPagina, Vazio, classeBotao, cx } from "@/components/ui";
import { FormRevisarAcesso } from "../prontuarios/[id]/formularios";
import { BotaoFiltro, IndicadorLink } from "@/components/carregando";

export const metadata: Metadata = { title: "Auditoria" };

const POR_PAGINA = 100;
const ACOES_SENSIVEIS = new Set(["ACESSO_EMERGENCIAL", "LOGIN_BLOQUEADO", "PRONTUARIO_IMPRESSO", "ACESSO_REVOGADO", "CONSENTIMENTO_ALTERADO"]);

export default async function PaginaAuditoria({ searchParams }: PageProps<"/auditoria">) {
  const usuario = await exigirUsuario();
  if (!podeVerAuditoria(usuario)) redirect("/");
  const sp = await searchParams;
  const texto = (v: unknown) => (typeof v === "string" ? v : "");
  const acao = texto(sp.acao);
  const pessoa = texto(sp.pessoa);
  const de = /^\d{4}-\d{2}-\d{2}$/.test(texto(sp.de)) ? texto(sp.de) : "";
  const ate = /^\d{4}-\d{2}-\d{2}$/.test(texto(sp.ate)) ? texto(sp.ate) : "";
  const numero = Number(texto(sp.numero).replace(/\D/g, "").slice(-6)) || null;
  const pagina = Math.max(1, Number(texto(sp.pagina)) || 1);

  const prontuariosDaUnidade = db
    .select({ id: schema.prontuarios.id })
    .from(schema.prontuarios)
    .where(eq(schema.prontuarios.unidadeOrigemId, usuario.unidadeId));

  const filtros: SQL[] = [];
  if (usuario.papel === "GESTORA") {
    // Gestão vê o que a própria equipe fez e quem mexeu nos prontuários abertos pela unidade.
    filtros.push(or(eq(schema.auditoria.unidadeId, usuario.unidadeId), inArray(schema.auditoria.prontuarioId, prontuariosDaUnidade))!);
  }
  if (acao) filtros.push(eq(schema.auditoria.acao, acao));
  if (pessoa) filtros.push(eq(schema.auditoria.usuarioId, pessoa));
  if (de) filtros.push(gte(schema.auditoria.criadoEm, sql`${de}::date`));
  if (ate) filtros.push(lt(schema.auditoria.criadoEm, sql`${ate}::date + interval '1 day'`));
  if (numero) {
    filtros.push(
      inArray(
        schema.auditoria.prontuarioId,
        db.select({ id: schema.prontuarios.id }).from(schema.prontuarios).where(eq(schema.prontuarios.numero, numero)),
      ),
    );
  }

  const [mapas, eventos, pendentes, equipe] = await Promise.all([
    mapasRede(),
    db
      .select({ a: schema.auditoria, numero: schema.prontuarios.numero, pCriado: schema.prontuarios.criadoEm })
      .from(schema.auditoria)
      .leftJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.auditoria.prontuarioId))
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(schema.auditoria.id))
      .limit(POR_PAGINA + 1)
      .offset((pagina - 1) * POR_PAGINA),
    usuario.papel === "GESTORA"
      ? db
          .select({ ac: schema.acessos, p: schema.prontuarios })
          .from(schema.acessos)
          .innerJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.acessos.prontuarioId))
          .where(
            and(
              eq(schema.prontuarios.unidadeOrigemId, usuario.unidadeId),
              inArray(schema.acessos.origem, ["EMERGENCIAL", "AUTORIZACAO"]),
              isNull(schema.acessos.revisadoEm),
              isNull(schema.acessos.revogadoEm),
              ne(schema.acessos.unidadeId, usuario.unidadeId),
            ),
          )
          .orderBy(desc(schema.acessos.criadoEm))
      : Promise.resolve([]),
    db
      .select({ id: schema.usuarios.id, nome: schema.usuarios.nome })
      .from(schema.usuarios)
      .where(usuario.papel === "GESTORA" ? eq(schema.usuarios.unidadeId, usuario.unidadeId) : undefined)
      .orderBy(schema.usuarios.nome),
  ]);

  const temMais = eventos.length > POR_PAGINA;
  const visiveis = eventos.slice(0, POR_PAGINA);
  const qs = (extra: Record<string, string>) =>
    `/auditoria?${new URLSearchParams({ ...(acao && { acao }), ...(pessoa && { pessoa }), ...(de && { de }), ...(ate && { ate }), ...(numero && { numero: String(numero) }), ...extra })}`;

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Trilha de auditoria"
        descricao={
          usuario.papel === "GESTORA"
            ? "O que a sua equipe fez no sistema e quem, de qualquer unidade, acessou prontuários abertos pela sua unidade. Os registros não podem ser alterados nem apagados."
            : "Todos os eventos do sistema. Os registros não podem ser alterados nem apagados."
        }
      />

      {usuario.papel === "GESTORA" && (
        <Cartao className={cx(pendentes.length > 0 && "border-amber-300")}>
          <CabecalhoCartao
            icone={<Siren className="size-5 text-amber-600" />}
            titulo="Acessos a revisar"
            descricao="Outras unidades abriram prontuários da sua unidade por acesso emergencial ou autorização direta. Confira se foi justificado."
          />
          {pendentes.length === 0 ? (
            <p className="px-5 py-5 text-sm text-zinc-500">Nenhum acesso pendente de revisão.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pendentes.map(({ ac, p }) => (
                <li key={ac.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <SeloUnidade unidade={mapas.unidade(ac.unidadeId)} />
                      <strong>{mapas.pessoa(ac.concedidoPorId).nome}</strong>
                      <span className={cx("text-xs", ac.origem === "EMERGENCIAL" ? "font-semibold text-rose-700" : "text-zinc-500")}>
                        {ROTULO_ORIGEM_ACESSO[ac.origem]}
                      </span>
                      <span className="text-xs text-zinc-500">{formatarDataHora(ac.criadoEm)}</span>
                    </p>
                    <p className="mt-1 text-sm">
                      Prontuário{" "}
                      <Link href={`/prontuarios/${p.id}?aba=acessos`} className="font-medium text-marca-700 underline">
                        {numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)} — {nomeExibicao(p)}
                      </Link>
                    </p>
                    <p className="mt-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">“{ac.justificativa}”</p>
                  </div>
                  <FormRevisarAcesso acessoId={ac.id} jaRevisado={false} />
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      )}

      <Cartao>
        <Form action="/auditoria" className="grid gap-3 border-b border-zinc-100 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_150px_150px_130px_auto]">
          <Seletor name="acao" defaultValue={acao} aria-label="Ação">
            <option value="">Todas as ações</option>
            {Object.entries(ROTULO_ACAO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Seletor>
          <Seletor name="pessoa" defaultValue={pessoa} aria-label="Pessoa">
            <option value="">Todas as pessoas{usuario.papel === "GESTORA" ? " da unidade" : ""}</option>
            {equipe.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </Seletor>
          <Entrada type="date" name="de" defaultValue={de} aria-label="De" />
          <Entrada type="date" name="ate" defaultValue={ate} aria-label="Até" />
          <Entrada name="numero" defaultValue={numero ? String(numero) : ""} placeholder="Nº prontuário" aria-label="Número do prontuário" />
          <BotaoFiltro className={classeBotao("primario")}>Filtrar</BotaoFiltro>
        </Form>

        {visiveis.length === 0 ? (
          <Vazio titulo="Nenhum evento encontrado" icone={<ShieldAlert className="size-10" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Quem</th>
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Prontuário</th>
                  <th className="px-5 py-2 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visiveis.map(({ a, numero: n, pCriado }) => (
                  <tr key={a.id} className={cx(ACOES_SENSIVEIS.has(a.acao) && "bg-amber-50/50", a.acao === "ACESSO_EMERGENCIAL" && "bg-rose-50/60")}>
                    <td className="px-5 py-2.5 text-xs whitespace-nowrap text-zinc-500 tabular-nums">{formatarDataHora(a.criadoEm)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {a.unidadeId && <SeloUnidade unidade={mapas.unidade(a.unidadeId)} />}
                        <span className="whitespace-nowrap">{a.usuarioId ? mapas.pessoa(a.usuarioId).nome : "—"}</span>
                      </div>
                    </td>
                    <td className={cx("px-3 py-2.5", a.acao === "ACESSO_EMERGENCIAL" && "font-semibold text-rose-800")}>{ROTULO_ACAO[a.acao] ?? a.acao}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {n && pCriado && a.prontuarioId ? (
                        <Link href={`/prontuarios/${a.prontuarioId}`} className="text-marca-700 hover:underline">
                          {numeroProntuario(n, pCriado, PREFIXO_PRONTUARIO)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-sm px-5 py-2.5 text-xs text-zinc-600">
                      <Detalhes d={a.detalhes} />
                      {a.ip && <span className="block text-zinc-400">IP {a.ip}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-sm">
          <span className="text-zinc-500">Página {pagina}</span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link className={classeBotao("secundario", "sm")} href={qs({ pagina: String(pagina - 1) })}>
                <IndicadorLink /> Anterior
              </Link>
            )}
            {temMais && (
              <Link className={classeBotao("secundario", "sm")} href={qs({ pagina: String(pagina + 1) })}>
                Próxima <IndicadorLink />
              </Link>
            )}
          </div>
        </div>
      </Cartao>
    </div>
  );
}

const ROTULOS_DETALHE: Record<string, string> = {
  termo: "busca",
  resultados: "resultados",
  justificativa: "justificativa",
  tipo: "tipo",
  motivo: "motivo",
  classificacao: "classificação",
  tentativas: "tentativas",
  email: "e-mail",
  campos: "campos",
  sigilo: "sigilo",
  urgencia: "urgência",
  de: "de",
  para: "para",
};

function Detalhes({ d }: { d: Record<string, unknown> | null }) {
  if (!d) return null;
  const itens = Object.entries(d).filter(([k, v]) => ROTULOS_DETALHE[k] && v !== undefined && v !== null && v !== "");
  if (itens.length === 0) return null;
  return (
    <span>
      {itens.map(([k, v]) => (
        <span key={k} className="mr-2">
          <span className="text-zinc-400">{ROTULOS_DETALHE[k]}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}
        </span>
      ))}
    </span>
  );
}
