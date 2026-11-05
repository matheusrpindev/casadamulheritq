import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { Inbox, Lock, Send, ShieldCheck } from "lucide-react";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { decifrar, decifrarOpcional } from "@/lib/cripto";
import { mapasRede, prontuariosAcessiveis } from "@/lib/dados/prontuario";
import { podeRegistrarAtendimento } from "@/lib/permissoes";
import { formatarDataHora, nomeExibicao, tempoRelativo } from "@/lib/texto";
import { Cartao, SeloUnidade, TituloPagina, Vazio, cx } from "@/components/ui";
import { Avatar, SeloRisco, SeloStatusEncaminhamento, SeloUrgencia } from "@/components/selos";
import { AcoesEncaminhamento } from "../prontuarios/[id]/formularios";
import { PedidoAcesso } from "../busca/pedido-acesso";

export const metadata: Metadata = { title: "Encaminhamentos" };

export default async function PaginaEncaminhamentos({ searchParams }: PageProps<"/encaminhamentos">) {
  const usuario = await exigirUsuario();
  const sp = await searchParams;
  const caixa = sp.caixa === "enviados" ? "enviados" : "recebidos";
  const todos = sp.status === "todos";
  const tecnica = podeRegistrarAtendimento(usuario);

  const filtros: SQL[] = [
    caixa === "recebidos"
      ? eq(schema.encaminhamentos.destinoUnidadeId, usuario.unidadeId)
      : eq(schema.encaminhamentos.origemUnidadeId, usuario.unidadeId),
  ];
  if (!todos) filtros.push(inArray(schema.encaminhamentos.status, ["ENVIADO", "RECEBIDO"]));

  const linhas = await db
    .select({ e: schema.encaminhamentos, p: schema.prontuarios })
    .from(schema.encaminhamentos)
    .innerJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.encaminhamentos.prontuarioId))
    .where(and(...filtros))
    .orderBy(desc(schema.encaminhamentos.criadoEm))
    .limit(100);

  const [mapas, acessiveis] = await Promise.all([
    mapasRede(),
    prontuariosAcessiveis(usuario.unidadeId, [...new Set(linhas.map((l) => l.p.id))]),
  ]);

  const abas = [
    { id: "recebidos", rotulo: "Recebidos pela unidade", icone: Inbox },
    { id: "enviados", rotulo: "Enviados pela unidade", icone: Send },
  ] as const;

  return (
    <div>
      <TituloPagina
        titulo="Encaminhamentos"
        descricao="Quem a rede encaminhou para sua unidade e para onde sua unidade encaminhou. Ao receber, leia a ficha de passagem e o prontuário antes do atendimento."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-zinc-200">
          {abas.map((a) => (
            <Link
              key={a.id}
              href={`/encaminhamentos?caixa=${a.id}${todos ? "&status=todos" : ""}`}
              className={cx(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                caixa === a.id ? "bg-marca-700 text-white" : "text-zinc-600 hover:bg-zinc-50",
              )}
            >
              <a.icone className="size-4" /> {a.rotulo}
            </Link>
          ))}
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/encaminhamentos?caixa=${caixa}`} className={cx(!todos ? "font-semibold text-marca-800" : "text-zinc-500 hover:text-zinc-800")}>
            Em aberto
          </Link>
          <Link
            href={`/encaminhamentos?caixa=${caixa}&status=todos`}
            className={cx(todos ? "font-semibold text-marca-800" : "text-zinc-500 hover:text-zinc-800")}
          >
            Todos
          </Link>
        </div>
      </div>

      <Cartao>
        {linhas.length === 0 ? (
          <Vazio titulo={todos ? "Nenhum encaminhamento" : "Nenhum encaminhamento em aberto"} icone={<Inbox className="size-10" />} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {linhas.map(({ e, p }) => {
              const temAcesso = acessiveis.has(p.id);
              const motivo = tecnica ? decifrar(e.motivoCifrado) : null;
              const resposta = tecnica ? decifrarOpcional(e.respostaCifrado) : null;
              const aberto = e.status === "ENVIADO" || e.status === "RECEBIDO";
              const ehDestino = e.destinoUnidadeId === usuario.unidadeId;
              return (
                <li key={e.id} className={cx("px-5 py-4", e.status === "ENVIADO" && caixa === "recebidos" && "bg-amber-50/40")}>
                  <div className="flex flex-wrap items-start gap-4">
                    <Avatar nome={nomeExibicao(p)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {temAcesso ? (
                          <Link href={`/prontuarios/${p.id}`} className="font-medium text-zinc-900 hover:text-marca-800 hover:underline">
                            {nomeExibicao(p)}
                          </Link>
                        ) : (
                          <span className="font-medium text-zinc-900">{nomeExibicao(p)}</span>
                        )}
                        <SeloUrgencia urgencia={e.urgencia} />
                        <SeloStatusEncaminhamento status={e.status} />
                        {temAcesso && <SeloRisco nivel={p.nivelRisco} />}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                        <SeloUnidade unidade={mapas.unidade(e.origemUnidadeId)} /> →{" "}
                        {e.destinoUnidadeId ? <SeloUnidade unidade={mapas.unidade(e.destinoUnidadeId)} /> : <span>{e.destinoExterno}</span>}
                        <span>
                          · {tempoRelativo(e.criadoEm)} ({formatarDataHora(e.criadoEm)}) · por {mapas.pessoa(e.criadoPorId).nome}
                        </span>
                      </p>
                      {motivo && (
                        <div className="mt-3 rounded-lg bg-marca-50/70 px-4 py-3">
                          <p className="text-xs font-semibold text-marca-900">Ficha de passagem</p>
                          <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-800">{motivo}</p>
                        </div>
                      )}
                      {resposta && (
                        <div className="mt-2 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
                          <p className="text-xs font-semibold text-zinc-600">Devolutiva</p>
                          <p className="mt-1 whitespace-pre-wrap text-zinc-800">{resposta}</p>
                        </div>
                      )}
                      {caixa === "recebidos" && (
                        <p className={cx("mt-2 flex items-center gap-1.5 text-xs", temAcesso ? "text-emerald-700" : "text-amber-800")}>
                          {temAcesso ? (
                            <>
                              <ShieldCheck className="size-3.5" /> Histórico compartilhado com sua unidade —{" "}
                              <Link href={`/prontuarios/${p.id}`} className="font-medium underline">
                                ler antes de atender
                              </Link>
                            </>
                          ) : (
                            <>
                              <Lock className="size-3.5" /> Ela não autorizou o compartilhamento do histórico. Quando ela chegar, pergunte se autoriza.
                            </>
                          )}
                        </p>
                      )}
                      {caixa === "recebidos" && !temAcesso && tecnica && aberto && (
                        <div className="mt-2">
                          <PedidoAcesso prontuarioId={p.id} autorizado={p.compartilhamentoAutorizado} />
                        </div>
                      )}
                      {aberto && (
                        <AcoesEncaminhamento
                          id={e.id}
                          podeReceber={ehDestino && e.status === "ENVIADO"}
                          podeConcluir={ehDestino && tecnica}
                          podeRecusar={ehDestino && tecnica && e.status === "ENVIADO"}
                          podeCancelar={!ehDestino && e.origemUnidadeId === usuario.unidadeId && tecnica}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
