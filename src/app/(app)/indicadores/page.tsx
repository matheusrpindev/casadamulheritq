import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, type SQL } from "drizzle-orm";
import { Clock, FilePlus2, Info, Send, Siren, Users } from "lucide-react";
import { db } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { podeVerIndicadores } from "@/lib/permissoes";
import { mapasRede } from "@/lib/dados/prontuario";
import { ROTULO_RISCO, ROTULO_VIOLENCIA } from "@/lib/rotulos";
import { CabecalhoCartao, Cartao, TituloPagina, cx } from "@/components/ui";
import { BarrasHorizontais, Colunas, Proporcao, suprimirPequenos } from "@/components/graficos";

export const metadata: Metadata = { title: "Indicadores" };

async function linhas<T>(consulta: SQL): Promise<T[]> {
  const r = await db.execute(consulta);
  return r.rows as T[];
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function PaginaIndicadores({ searchParams }: PageProps<"/indicadores">) {
  const usuario = await exigirUsuario();
  if (!podeVerIndicadores(usuario)) redirect("/");
  const sp = await searchParams;
  const meses = [3, 6, 12].includes(Number(sp.meses)) ? Number(sp.meses) : 12;
  const escopoUnidade = sp.escopo === "unidade" && usuario.papel !== "ADMIN";
  const u = usuario.unidadeId;

  const desde = sql`(date_trunc('month', now()) - make_interval(months => ${meses - 1}))`;
  const fP = escopoUnidade ? sql`and p.unidade_origem_id = ${u}` : sql``;
  const fA = escopoUnidade ? sql`and a.unidade_id = ${u}` : sql``;
  const fE = escopoUnidade ? sql`and (e.origem_unidade_id = ${u} or e.destino_unidade_id = ${u})` : sql``;
  const fRisco = escopoUnidade
    ? sql`and p.id in (select prontuario_id from acessos where unidade_id = ${u} and revogado_em is null and (expira_em is null or expira_em > now()))`
    : sql``;

  const [
    mapas,
    [totais],
    porMes,
    porUnidade,
    violencias,
    riscos,
    bairros,
    racas,
    fluxos,
  ] = await Promise.all([
    mapasRede(),
    linhas<{ novos: number; atendimentos: number; encaminhamentos: number; mediana_horas: number | null; emergenciais: number; com_risco: number }>(sql`
      select
        (select count(*)::int from prontuarios p where p.criado_em >= ${desde} ${fP}) as novos,
        (select count(*)::int from atendimentos a where a.realizado_em >= ${desde} ${fA}) as atendimentos,
        (select count(*)::int from encaminhamentos e where e.criado_em >= ${desde} and e.destino_unidade_id is not null ${fE}) as encaminhamentos,
        (select percentile_cont(0.5) within group (order by extract(epoch from (e.recebido_em - e.criado_em)) / 3600)
           from encaminhamentos e where e.recebido_em is not null and e.criado_em >= ${desde} ${fE}) as mediana_horas,
        (select count(*)::int from acessos ac where ac.origem = 'EMERGENCIAL' and ac.criado_em >= ${desde}
           ${escopoUnidade ? sql`and (ac.unidade_id = ${u} or ac.prontuario_id in (select id from prontuarios where unidade_origem_id = ${u}))` : sql``}) as emergenciais,
        (select count(*)::int from prontuarios p where p.criado_em >= ${desde} and p.nivel_risco <> 'NAO_AVALIADO' ${fP}) as com_risco
    `),
    linhas<{ mes: string; total: number }>(sql`
      select to_char(m, 'YYYY-MM') as mes, coalesce(count(a.id), 0)::int as total
      from generate_series(${desde}, date_trunc('month', now()), interval '1 month') m
      left join atendimentos a on date_trunc('month', a.realizado_em) = m ${fA}
      group by m order by m
    `),
    linhas<{ unidade_id: string; total: number }>(sql`
      select a.unidade_id, count(*)::int as total from atendimentos a
      where a.realizado_em >= ${desde} ${fA} group by a.unidade_id order by total desc
    `),
    linhas<{ tipo: string; total: number }>(sql`
      select t as tipo, count(distinct r.prontuario_id)::int as total
      from relatos r cross join lateral unnest(r.tipos_violencia) t
      join prontuarios p on p.id = r.prontuario_id
      where r.criado_em >= ${desde} and r.retifica_id is null ${fP}
      group by t order by total desc
    `),
    linhas<{ nivel: string; total: number }>(sql`
      select p.nivel_risco as nivel, count(*)::int as total from prontuarios p
      where p.status = 'ATIVO' ${fRisco} group by p.nivel_risco
    `),
    linhas<{ bairro: string; total: number }>(sql`
      select coalesce(nullif(trim(p.bairro), ''), 'Não informado') as bairro, count(*)::int as total
      from prontuarios p where p.criado_em >= ${desde} ${fP} group by 1 order by total desc limit 10
    `),
    linhas<{ raca: string; total: number }>(sql`
      select coalesce(p.raca_cor, 'Não informado') as raca, count(*)::int as total
      from prontuarios p where p.criado_em >= ${desde} ${fP} group by 1 order by total desc
    `),
    linhas<{ origem: string; destino: string; total: number; recebidos: number }>(sql`
      select e.origem_unidade_id as origem, e.destino_unidade_id as destino, count(*)::int as total,
             count(*) filter (where e.status in ('RECEBIDO', 'CONCLUIDO'))::int as recebidos
      from encaminhamentos e where e.destino_unidade_id is not null and e.criado_em >= ${desde} ${fE}
      group by 1, 2 order by total desc limit 8
    `),
  ]);

  const mediana = totais.mediana_horas === null ? null : Number(totais.mediana_horas);
  const textoMediana =
    mediana === null ? "—" : mediana < 1 ? "< 1 h" : mediana < 48 ? `${Math.round(mediana)} h` : `${Math.round(mediana / 24)} dias`;
  const corRisco: Record<string, string> = {
    ELEVADO: "#e11d48",
    MEDIO: "#d97706",
    BAIXO: "#059669",
    NAO_AVALIADO: "#cbd5e1",
  };
  const ordemRisco = ["ELEVADO", "MEDIO", "BAIXO", "NAO_AVALIADO"] as const;

  const link = (mudanca: Record<string, string>) => {
    const q = new URLSearchParams({ meses: String(meses), ...(escopoUnidade ? { escopo: "unidade" } : {}), ...mudanca });
    if (q.get("escopo") === "rede") q.delete("escopo");
    return `/indicadores?${q}`;
  };

  return (
    <div>
      <TituloPagina
        titulo="Indicadores da rede"
        descricao="Números agregados para planejar a política pública. Nenhum dado aqui identifica uma mulher: contagens menores que 3 em bairro e raça/cor aparecem como “< 3”."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {usuario.papel !== "ADMIN" && (
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200">
            {[
              { id: "rede", rotulo: "Rede toda" },
              { id: "unidade", rotulo: usuario.unidade.sigla },
            ].map((e) => (
              <Link
                key={e.id}
                href={link({ escopo: e.id })}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  (e.id === "unidade") === escopoUnidade ? "bg-marca-700 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {e.rotulo}
              </Link>
            ))}
          </div>
        )}
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200">
          {[3, 6, 12].map((m) => (
            <Link
              key={m}
              href={link({ meses: String(m) })}
              className={cx("rounded-lg px-3 py-1.5 text-sm font-medium", m === meses ? "bg-marca-700 text-white" : "text-slate-600 hover:bg-slate-50")}
            >
              {m} meses
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Numero icone={<FilePlus2 />} valor={totais.novos} rotulo="Mulheres acolhidas pela primeira vez" />
        <Numero icone={<Users />} valor={totais.atendimentos} rotulo="Atendimentos registrados" />
        <Numero icone={<Send />} valor={totais.encaminhamentos} rotulo="Encaminhamentos entre unidades" />
        <Numero icone={<Clock />} valor={textoMediana} rotulo="Tempo mediano até ela ser recebida" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao className="lg:col-span-2">
          <CabecalhoCartao titulo="Atendimentos por mês" />
          <div className="p-5">
            <Colunas
              barras={porMes.map((m) => {
                const [a, mm] = m.mes.split("-");
                return { rotulo: `${MESES[Number(mm) - 1]}${meses > 6 ? "" : `/${a.slice(2)}`}`, valor: m.total };
              })}
              unidade=" atendimentos"
            />
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Atendimentos por unidade" />
          <div className="p-5">
            <BarrasHorizontais barras={porUnidade.map((x) => ({ rotulo: mapas.unidade(x.unidade_id).sigla, valor: x.total }))} />
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Formas de violência relatadas" descricao="Mulheres com ao menos um relato de cada forma (Lei 11.340, art. 7º)." />
          <div className="p-5">
            <BarrasHorizontais
              barras={violencias.map((v) => ({ rotulo: ROTULO_VIOLENCIA[v.tipo as keyof typeof ROTULO_VIOLENCIA] ?? v.tipo, valor: v.total }))}
            />
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Risco atual dos casos ativos" descricao="Última classificação registrada (FONAR)." />
          <div className="p-5">
            <Proporcao
              partes={ordemRisco.map((n) => ({
                rotulo: ROTULO_RISCO[n],
                valor: riscos.find((r) => r.nivel === n)?.total ?? 0,
                cor: corRisco[n],
              }))}
            />
            <p className="mt-4 text-xs text-slate-500">
              {totais.novos > 0
                ? `${Math.round((totais.com_risco / totais.novos) * 100)}% das mulheres acolhidas no período já têm avaliação de risco.`
                : "Sem novos acolhimentos no período."}
            </p>
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Fluxos de encaminhamento" descricao="Origem → destino, e quantos chegaram a ser recebidos." />
          {fluxos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Sem encaminhamentos no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2 font-medium">Fluxo</th>
                  <th className="px-3 py-2 text-right font-medium">Enviados</th>
                  <th className="px-5 py-2 text-right font-medium">Recebidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fluxos.map((f) => (
                  <tr key={`${f.origem}-${f.destino}`}>
                    <td className="px-5 py-2.5 text-slate-700">
                      {mapas.unidade(f.origem).sigla} → {mapas.unidade(f.destino).sigla}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{f.total}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {f.recebidos} <span className="text-xs text-slate-500">({Math.round((f.recebidos / f.total) * 100)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Bairros com mais acolhimentos" descricao="Novos prontuários no período (10 primeiros)." />
          <div className="p-5">
            <BarrasHorizontais barras={suprimirPequenos(bairros.map((b) => ({ rotulo: b.bairro, valor: b.total })))} />
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Raça/cor (autodeclarada)" descricao="Novos prontuários no período." />
          <div className="p-5">
            <BarrasHorizontais barras={suprimirPequenos(racas.map((r) => ({ rotulo: r.raca, valor: r.total })))} />
          </div>
        </Cartao>
      </div>

      <div className={cx("mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", totais.emergenciais > 0 ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-600")}>
        {totais.emergenciais > 0 ? <Siren className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
        <p>
          {totais.emergenciais} acesso{totais.emergenciais === 1 ? "" : "s"} emergencia{totais.emergenciais === 1 ? "l" : "is"} no período.{" "}
          <Link href="/auditoria?acao=ACESSO_EMERGENCIAL" className="font-medium underline">
            Revisar na auditoria
          </Link>
        </p>
      </div>
    </div>
  );
}

function Numero({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number | string; rotulo: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-xs">
      <div className="mb-2 text-marca-600 [&>svg]:size-5">{icone}</div>
      <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{rotulo}</p>
    </div>
  );
}
