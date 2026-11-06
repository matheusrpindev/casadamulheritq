import "server-only";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { decifrar } from "@/lib/cripto";
import { avaliarFonar, type Respostas } from "@/lib/fonar";
import {
  contarEmOrdem,
  FAIXAS_ETARIAS,
  faixaEtaria,
  idadeEm,
  inicioDoPeriodo,
  ORDEM_FILHOS,
  ORDEM_SIM_NAO,
  rotuloFilhos,
  rotuloSimNao,
} from "@/lib/relatorios";
import {
  ESCOLARIDADES,
  ESTADOS_CIVIS,
  FAIXAS_RENDA,
  IDENTIDADES_GENERO,
  RACAS_COR,
  ROTULO_RISCO,
  ROTULO_STATUS_MEDIDA,
  ROTULO_VINCULO,
  ROTULO_VIOLENCIA,
  SITUACOES_MORADIA,
  SITUACOES_TRABALHO,
} from "@/lib/rotulos";
import { hojeISO } from "@/lib/texto";
import { mapasRede } from "./prontuario";

export type Barra = { rotulo: string; valor: number };

export type Grafico = {
  id: string;
  titulo: string;
  descricao?: string;
  barras: Barra[];
  /** Base para o percentual (ex.: total de mulheres); sem ela, não mostra %. */
  total?: number;
  /** Esconde contagens 1–2 (risco de identificar alguém). */
  suprimir?: boolean;
};

export type FiltroRelatorio = { meses: number; unidadeId: string | null };

async function linhas<T>(consulta: SQL): Promise<T[]> {
  return (await db.execute(consulta)).rows as T[];
}

const naoInformado = (v: string | null | undefined) => (v && v.trim() ? v : "Não informado");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export async function carregarRelatorio({ meses, unidadeId: u }: FiltroRelatorio) {
  // Calculado aqui (e não com uma consulta) para as consultas abaixo saírem todas juntas.
  const d = inicioDoPeriodo(meses);

  // Filtros por escopo (rede inteira ou uma unidade)
  const fP = u ? sql`and p.unidade_origem_id = ${u}` : sql``;
  const fA = u ? sql`and a.unidade_id = ${u}` : sql``;
  const fE = u ? sql`and (e.origem_unidade_id = ${u} or e.destino_unidade_id = ${u})` : sql``;
  const fRisco = u
    ? sql`and p.id in (select prontuario_id from acessos where unidade_id = ${u} and revogado_em is null and (expira_em is null or expira_em > now()))`
    : sql``;
  /** Mulheres acolhidas pela primeira vez no período: base do perfil e da violência. */
  const base = sql`(select p.id from prontuarios p where p.criado_em >= ${d} ${fP})`;

  const [mapas, [totais], porMes, porUnidade, riscos, fluxos, pessoas, formas, vinculos, armas, avaliacoes, medidas] = await Promise.all([
    mapasRede(),
    linhas<{ novos: number; atendimentos: number; encaminhamentos: number; mediana_horas: number | null; emergenciais: number; com_risco: number }>(sql`
      select
        (select count(*)::int from prontuarios p where p.criado_em >= ${d} ${fP}) as novos,
        (select count(*)::int from atendimentos a where a.realizado_em >= ${d} ${fA}) as atendimentos,
        (select count(*)::int from encaminhamentos e where e.criado_em >= ${d} and e.destino_unidade_id is not null ${fE}) as encaminhamentos,
        (select percentile_cont(0.5) within group (order by extract(epoch from (e.recebido_em - e.criado_em)) / 3600)
           from encaminhamentos e where e.recebido_em is not null and e.criado_em >= ${d} ${fE}) as mediana_horas,
        (select count(*)::int from acessos ac where ac.origem = 'EMERGENCIAL' and ac.criado_em >= ${d}
           ${u ? sql`and (ac.unidade_id = ${u} or ac.prontuario_id in (select id from prontuarios where unidade_origem_id = ${u}))` : sql``}) as emergenciais,
        (select count(*)::int from prontuarios p where p.criado_em >= ${d} and p.nivel_risco <> 'NAO_AVALIADO' ${fP}) as com_risco
    `),
    linhas<{ mes: string; total: number }>(sql`
      select to_char(m, 'YYYY-MM') as mes, coalesce(count(a.id), 0)::int as total
      from generate_series(date_trunc('month', ${d}::timestamptz at time zone 'America/Sao_Paulo'),
                           date_trunc('month', now() at time zone 'America/Sao_Paulo'), interval '1 month') m
      left join atendimentos a on date_trunc('month', a.realizado_em at time zone 'America/Sao_Paulo') = m ${fA}
      group by m order by m
    `),
    linhas<{ unidade_id: string; total: number }>(sql`
      select a.unidade_id, count(*)::int as total from atendimentos a
      where a.realizado_em >= ${d} ${fA} group by a.unidade_id order by total desc
    `),
    linhas<{ nivel: string; total: number }>(sql`
      select p.nivel_risco as nivel, count(*)::int as total from prontuarios p
      where p.status = 'ATIVO' ${fRisco} group by p.nivel_risco
    `),
    linhas<{ origem: string; destino: string; total: number; recebidos: number }>(sql`
      select e.origem_unidade_id as origem, e.destino_unidade_id as destino, count(*)::int as total,
             count(*) filter (where e.status in ('RECEBIDO', 'CONCLUIDO'))::int as recebidos
      from encaminhamentos e where e.destino_unidade_id is not null and e.criado_em >= ${d} ${fE}
      group by 1, 2 order by total desc limit 10
    `),
    db
      .select({
        dataNascimento: schema.prontuarios.dataNascimento,
        criadoEm: schema.prontuarios.criadoEm,
        racaCor: schema.prontuarios.racaCor,
        identidadeGenero: schema.prontuarios.identidadeGenero,
        escolaridade: schema.prontuarios.escolaridade,
        estadoCivil: schema.prontuarios.estadoCivil,
        quantidadeFilhos: schema.prontuarios.quantidadeFilhos,
        filhosMenores: schema.prontuarios.filhosMenores,
        gestante: schema.prontuarios.gestante,
        pessoaComDeficiencia: schema.prontuarios.pessoaComDeficiencia,
        situacaoTrabalho: schema.prontuarios.situacaoTrabalho,
        rendaFamiliar: schema.prontuarios.rendaFamiliar,
        recebeBeneficio: schema.prontuarios.recebeBeneficio,
        situacaoMoradia: schema.prontuarios.situacaoMoradia,
        dependenciaFinanceira: schema.prontuarios.dependenciaFinanceira,
        bairro: schema.prontuarios.bairro,
      })
      .from(schema.prontuarios)
      .where(and(gte(schema.prontuarios.criadoEm, d), u ? eq(schema.prontuarios.unidadeOrigemId, u) : undefined)),
    linhas<{ tipo: string; total: number }>(sql`
      select t as tipo, count(distinct r.prontuario_id)::int as total
      from relatos r cross join lateral unnest(r.tipos_violencia) t
      where r.retifica_id is null and r.prontuario_id in ${base}
      group by t order by total desc
    `),
    linhas<{ vinculo: string; total: number }>(sql`
      select au.vinculo, count(distinct au.prontuario_id)::int as total
      from autores au where au.prontuario_id in ${base} group by au.vinculo order by total desc
    `),
    linhas<{ situacao: string; total: number }>(sql`
      select situacao, count(*)::int as total from (
        select case when bool_or(au.acesso_arma = 'SIM') then 'Sim'
                    when bool_or(au.acesso_arma = 'NAO_SABE') then 'Não sabe'
                    else 'Não' end as situacao
        from autores au where au.prontuario_id in ${base} group by au.prontuario_id
      ) x group by situacao
    `),
    linhas<{ respostas_cifrado: string }>(sql`
      select distinct on (v.prontuario_id) v.respostas_cifrado
      from avaliacoes_risco v where v.prontuario_id in ${base}
      order by v.prontuario_id, v.criado_em desc
    `),
    linhas<{ status: string; total: number }>(sql`
      select m.status, count(*)::int as total from medidas_protetivas m
      where m.prontuario_id in ${base} group by m.status order by total desc
    `),
  ]);

  // ------------------------------------------------------------ perfil
  const n = pessoas.length;
  const filhosMenores = pessoas.map((p) =>
    p.filhosMenores === null ? (p.quantidadeFilhos === 0 ? "Não" : "Não informado") : p.filhosMenores > 0 ? "Sim" : "Não",
  );
  const perfil: Grafico[] = [
    {
      id: "idade",
      titulo: "Faixa etária",
      descricao: "Idade na data do primeiro acolhimento.",
      barras: contarEmOrdem(
        pessoas.map((p) => faixaEtaria(idadeEm(p.dataNascimento, hojeISO(p.criadoEm)))),
        FAIXAS_ETARIAS,
      ),
      total: n,
    },
    {
      id: "filhos",
      titulo: "Quantidade de filhos",
      barras: contarEmOrdem(pessoas.map((p) => rotuloFilhos(p.quantidadeFilhos)), ORDEM_FILHOS),
      total: n,
    },
    {
      id: "com-filhos",
      titulo: "Tem filhos?",
      barras: contarEmOrdem(
        pessoas.map((p) => (p.quantidadeFilhos === null ? "Não informado" : p.quantidadeFilhos > 0 ? "Sim" : "Não")),
        ORDEM_SIM_NAO,
      ),
      total: n,
    },
    {
      id: "filhos-menores",
      titulo: "Tem filhos menores de 18 anos?",
      descricao: "Sinaliza necessidade de creche, escola e atenção à guarda e à pensão.",
      barras: contarEmOrdem(filhosMenores, ORDEM_SIM_NAO),
      total: n,
    },
    { id: "gestante", titulo: "Gestante no acolhimento", barras: contarEmOrdem(pessoas.map((p) => rotuloSimNao(p.gestante)), ORDEM_SIM_NAO), total: n, suprimir: true },
    {
      id: "deficiencia",
      titulo: "Pessoa com deficiência",
      barras: contarEmOrdem(pessoas.map((p) => rotuloSimNao(p.pessoaComDeficiencia)), ORDEM_SIM_NAO),
      total: n,
      suprimir: true,
    },
    { id: "raca", titulo: "Raça/cor (autodeclarada)", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.racaCor)), [...RACAS_COR, "Não informado"]), total: n, suprimir: true },
    {
      id: "genero",
      titulo: "Identidade de gênero",
      barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.identidadeGenero)), [...IDENTIDADES_GENERO, "Não informado"]),
      total: n,
      suprimir: true,
    },
    { id: "estado-civil", titulo: "Estado civil", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.estadoCivil)), [...ESTADOS_CIVIS, "Não informado"]), total: n, suprimir: true },
    { id: "escolaridade", titulo: "Escolaridade", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.escolaridade)), [...ESCOLARIDADES, "Não informado"]), total: n, suprimir: true },
    { id: "trabalho", titulo: "Trabalho", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.situacaoTrabalho)), [...SITUACOES_TRABALHO, "Não informado"]), total: n, suprimir: true },
    { id: "renda", titulo: "Renda familiar", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.rendaFamiliar)), [...FAIXAS_RENDA, "Não informado"]), total: n, suprimir: true },
    {
      id: "dependencia",
      titulo: "Depende financeiramente do autor",
      barras: contarEmOrdem(pessoas.map((p) => rotuloSimNao(p.dependenciaFinanceira)), ORDEM_SIM_NAO),
      total: n,
      suprimir: true,
    },
    {
      id: "beneficio",
      titulo: "Recebe benefício social",
      barras: contarEmOrdem(pessoas.map((p) => rotuloSimNao(p.recebeBeneficio)), ORDEM_SIM_NAO),
      total: n,
      suprimir: true,
    },
    { id: "moradia", titulo: "Moradia", barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.situacaoMoradia)), [...SITUACOES_MORADIA, "Não informado"]), total: n, suprimir: true },
    {
      id: "bairro",
      titulo: "Bairros com mais acolhimentos",
      descricao: "Os 10 primeiros.",
      barras: contarEmOrdem(pessoas.map((p) => naoInformado(p.bairro)), [])
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      total: n,
      suprimir: true,
    },
  ];
  // Escalas ordenadas (idade, filhos, renda) e sim/não mostram todas as faixas, mesmo com zero;
  // nas listas de categorias, só aparece o que tem ocorrência. "Não informado" com zero nunca aparece.
  const ORDENADOS = new Set(["idade", "filhos", "renda", "com-filhos", "filhos-menores", "gestante", "deficiencia", "dependencia", "beneficio"]);
  for (const g of perfil) g.barras = g.barras.filter((b) => b.valor > 0 || (ORDENADOS.has(g.id) && b.rotulo !== "Não informado"));

  // ------------------------------------------------------------ violência e autor
  const fatoresGraves = new Map<string, number>();
  const fatoresAtencao = new Map<string, number>();
  let aceitaAbrigamento = 0;
  for (const a of avaliacoes) {
    const r = avaliarFonar(JSON.parse(decifrar(a.respostas_cifrado)) as Respostas);
    for (const f of r.fatoresGraves) fatoresGraves.set(f, (fatoresGraves.get(f) ?? 0) + 1);
    for (const f of r.fatoresAtencao) fatoresAtencao.set(f, (fatoresAtencao.get(f) ?? 0) + 1);
    if (r.aceitaAbrigamento) aceitaAbrigamento++;
  }
  const topo = (m: Map<string, number>, k: number) =>
    [...m.entries()]
      .map(([rotulo, valor]) => ({ rotulo, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, k);

  const violencia: Grafico[] = [
    {
      id: "formas",
      titulo: "Formas de violência relatadas",
      descricao: "Mulheres com ao menos um relato de cada forma (Lei 11.340/2006, art. 7º). Uma mulher pode ter mais de uma.",
      barras: formas.map((f) => ({ rotulo: ROTULO_VIOLENCIA[f.tipo as keyof typeof ROTULO_VIOLENCIA] ?? f.tipo, valor: f.total })),
      total: n,
    },
    {
      id: "vinculo",
      titulo: "Vínculo com o autor da violência",
      barras: vinculos.map((v) => ({ rotulo: ROTULO_VINCULO[v.vinculo as keyof typeof ROTULO_VINCULO] ?? v.vinculo, valor: v.total })),
      total: n,
      suprimir: true,
    },
    {
      id: "arma",
      titulo: "Autor com acesso a arma de fogo",
      descricao: "Entre as mulheres com autor registrado.",
      barras: contarEmOrdem(
        armas.flatMap((a) => Array<string>(a.total).fill(a.situacao)),
        ["Sim", "Não sabe", "Não"],
      ),
      total: armas.reduce((s, a) => s + a.total, 0),
      suprimir: true,
    },
    {
      id: "fatores-graves",
      titulo: "Fatores de risco grave mais frequentes (FONAR)",
      descricao: "Na avaliação mais recente de cada mulher.",
      barras: topo(fatoresGraves, 12),
      total: avaliacoes.length,
      suprimir: true,
    },
    {
      id: "fatores-atencao",
      titulo: "Fatores de atenção mais frequentes (FONAR)",
      barras: topo(fatoresAtencao, 10),
      total: avaliacoes.length,
      suprimir: true,
    },
    {
      id: "medidas",
      titulo: "Medidas protetivas por situação",
      descricao: "Medidas registradas para as mulheres acolhidas no período.",
      barras: medidas.map((m) => ({ rotulo: ROTULO_STATUS_MEDIDA[m.status as keyof typeof ROTULO_STATUS_MEDIDA] ?? m.status, valor: m.total })),
    },
  ];

  const ordemRisco = ["ELEVADO", "MEDIO", "BAIXO", "NAO_AVALIADO"] as const;

  return {
    desde: d,
    meses,
    escopo: u ? mapas.unidade(u) : null,
    totais: { ...totais, mediana_horas: totais.mediana_horas === null ? null : Number(totais.mediana_horas) },
    porMes: porMes.map((m) => {
      const [a, mm] = m.mes.split("-");
      return { rotulo: `${MESES[Number(mm) - 1]}${meses > 6 ? "" : `/${a.slice(2)}`}`, valor: m.total, mes: m.mes };
    }),
    porUnidade: porUnidade.map((x) => ({ rotulo: mapas.unidade(x.unidade_id).sigla, valor: x.total })),
    risco: ordemRisco.map((nivel) => ({ nivel, rotulo: ROTULO_RISCO[nivel], valor: riscos.find((r) => r.nivel === nivel)?.total ?? 0 })),
    fluxos: fluxos.map((f) => ({ origem: mapas.unidade(f.origem).sigla, destino: mapas.unidade(f.destino).sigla, total: f.total, recebidos: f.recebidos })),
    perfil: { base: n, graficos: perfil },
    violencia: { base: n, comAvaliacao: avaliacoes.length, aceitaAbrigamento, graficos: violencia },
  };
}

export type Relatorio = Awaited<ReturnType<typeof carregarRelatorio>>;

export const LIMIAR_SIGILO = 3;
export const ehOculto = (g: Grafico, valor: number) => !!g.suprimir && valor > 0 && valor < LIMIAR_SIGILO;
