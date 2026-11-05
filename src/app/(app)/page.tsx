import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ArrowRight, CalendarClock, FileSearch, Gavel, Inbox, ShieldAlert, UserPlus, Users } from "lucide-react";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { idsAcessiveisPelaUnidade } from "@/lib/dados/consultas";
import { mapasRede } from "@/lib/dados/prontuario";
import { formatarData, hojeISO, instante, nomeExibicao, numeroProntuario, tempoRelativo } from "@/lib/texto";
import { PREFIXO_PRONTUARIO } from "@/lib/config";
import { BotaoLink, CabecalhoCartao, Cartao, SeloUnidade, Vazio } from "@/components/ui";
import { Avatar, SeloRisco, SeloStatusEncaminhamento, SeloUrgencia } from "@/components/selos";

export default async function Painel() {
  const usuario = await exigirUsuario();
  if (usuario.papel === "ADMIN") redirect("/admin/usuarios");

  const acessiveis = idsAcessiveisPelaUnidade(usuario.unidadeId);
  const hoje = hojeISO();
  const em30dias = hojeISO(instante(30 * 86400000));
  const seteDiasAtras = instante(-7 * 86400000);

  const [mapas, entrada, riscoElevado, medidasVencendo, recentes, [{ atendimentosSemana }], [{ ativos }], [{ aguardando }]] =
    await Promise.all([
      mapasRede(),
      db
        .select({ e: schema.encaminhamentos, p: schema.prontuarios })
        .from(schema.encaminhamentos)
        .innerJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.encaminhamentos.prontuarioId))
        .where(
          and(
            eq(schema.encaminhamentos.destinoUnidadeId, usuario.unidadeId),
            inArray(schema.encaminhamentos.status, ["ENVIADO", "RECEBIDO"]),
          ),
        )
        .orderBy(
          sql`case ${schema.encaminhamentos.status} when 'ENVIADO' then 0 else 1 end`,
          sql`case ${schema.encaminhamentos.urgencia} when 'URGENTE' then 0 when 'PRIORITARIA' then 1 else 2 end`,
          desc(schema.encaminhamentos.criadoEm),
        )
        .limit(6),
      db
        .select()
        .from(schema.prontuarios)
        .where(
          and(
            inArray(schema.prontuarios.id, acessiveis),
            eq(schema.prontuarios.status, "ATIVO"),
            eq(schema.prontuarios.nivelRisco, "ELEVADO"),
          ),
        )
        .orderBy(desc(schema.prontuarios.riscoAtualizadoEm))
        .limit(6),
      db
        .select({ m: schema.medidasProtetivas, p: schema.prontuarios })
        .from(schema.medidasProtetivas)
        .innerJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.medidasProtetivas.prontuarioId))
        .where(
          and(
            inArray(schema.medidasProtetivas.prontuarioId, acessiveis),
            eq(schema.medidasProtetivas.status, "DEFERIDA"),
            gte(schema.medidasProtetivas.validaAte, hoje),
            lte(schema.medidasProtetivas.validaAte, em30dias),
          ),
        )
        .orderBy(schema.medidasProtetivas.validaAte)
        .limit(5),
      db
        .select({
          p: schema.prontuarios,
          ultimo: sql<Date>`max(${schema.atendimentos.realizadoEm})`.mapWith((v) => new Date(v)),
        })
        .from(schema.atendimentos)
        .innerJoin(schema.prontuarios, eq(schema.prontuarios.id, schema.atendimentos.prontuarioId))
        .where(eq(schema.atendimentos.unidadeId, usuario.unidadeId))
        .groupBy(schema.prontuarios.id)
        .orderBy(desc(sql`max(${schema.atendimentos.realizadoEm})`))
        .limit(6),
      db
        .select({ atendimentosSemana: count() })
        .from(schema.atendimentos)
        .where(and(eq(schema.atendimentos.unidadeId, usuario.unidadeId), gte(schema.atendimentos.realizadoEm, seteDiasAtras))),
      db
        .select({ ativos: count() })
        .from(schema.prontuarios)
        .where(and(inArray(schema.prontuarios.id, acessiveis), eq(schema.prontuarios.status, "ATIVO"))),
      db
        .select({ aguardando: count() })
        .from(schema.encaminhamentos)
        .where(
          and(
            eq(schema.encaminhamentos.destinoUnidadeId, usuario.unidadeId),
            eq(schema.encaminhamentos.status, "ENVIADO"),
          ),
        ),
    ]);

  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lilas-800 to-lilas-600 px-6 py-7 text-white shadow-sm sm:px-8">
        <div aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm text-lilas-100">{usuario.unidade.nome}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {saudacao}, {primeiroNome}.
        </h1>
        <p className="mt-1 text-lilas-100">
          {aguardando > 0
            ? `${aguardando} ${aguardando === 1 ? "mulher foi encaminhada" : "mulheres foram encaminhadas"} para sua unidade e ainda aguarda${aguardando === 1 ? "" : "m"} acolhimento.`
            : "Nenhum encaminhamento aguardando sua unidade agora."}
        </p>

        <form action="/busca" className="relative mt-5 flex max-w-xl gap-2">
          <label htmlFor="busca-rapida" className="sr-only">
            Buscar mulher na rede
          </label>
          <input
            id="busca-rapida"
            name="q"
            placeholder="Buscar por nome, nome social ou CPF…"
            className="h-11 flex-1 rounded-xl border-0 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-lilas-300 focus:outline-none"
          />
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-lilas-950/40 px-4 text-sm font-medium ring-1 ring-white/20 hover:bg-lilas-950/60">
            <FileSearch className="size-4" /> Buscar
          </button>
        </form>
        <p className="relative mt-3 text-xs text-lilas-100/80">
          Sempre busque antes de abrir um novo prontuário — ela pode já ter sido atendida em outra unidade.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador icone={<Inbox />} valor={aguardando} rotulo="Encaminhamentos aguardando" destaque={aguardando > 0} href="/encaminhamentos" />
        <Indicador icone={<Users />} valor={atendimentosSemana} rotulo="Atendimentos da unidade em 7 dias" />
        <Indicador icone={<ShieldAlert />} valor={riscoElevado.length} rotulo="Acompanhadas com risco elevado" alerta={riscoElevado.length > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Cartao className="lg:col-span-3">
          <CabecalhoCartao
            icone={<Inbox className="size-5" />}
            titulo="Chegando à sua unidade"
            descricao="Encaminhamentos da rede. O histórico já está no prontuário — leia antes de receber."
            acao={<BotaoLink href="/encaminhamentos" variante="fantasma" tamanho="sm">Ver todos <ArrowRight className="size-3.5" /></BotaoLink>}
          />
          {entrada.length === 0 ? (
            <Vazio titulo="Nada pendente por aqui" icone={<Inbox className="size-10" />}>
              Quando outra unidade encaminhar uma mulher para cá, ela aparece nesta lista.
            </Vazio>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entrada.map(({ e, p }) => (
                <li key={e.id}>
                  <Link href={`/prontuarios/${p.id}?aba=encaminhamentos`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                    <Avatar nome={nomeExibicao(p)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{nomeExibicao(p)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        de <SeloUnidade unidade={mapas.unidade(e.origemUnidadeId)} /> · {tempoRelativo(e.criadoEm)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SeloUrgencia urgencia={e.urgencia} />
                      <SeloStatusEncaminhamento status={e.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao icone={<ShieldAlert className="size-5 text-rose-600" />} titulo="Risco elevado" descricao="Prontuários ativos que sua unidade acompanha." />
            {riscoElevado.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Nenhum caso com risco elevado na sua unidade.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {riscoElevado.map((p) => (
                  <li key={p.id}>
                    <Link href={`/prontuarios/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{nomeExibicao(p)}</p>
                        <p className="text-xs text-slate-500">
                          {numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)} · avaliado {p.riscoAtualizadoEm ? tempoRelativo(p.riscoAtualizadoEm) : "—"}
                        </p>
                      </div>
                      <SeloRisco nivel={p.nivelRisco} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao>
            <CabecalhoCartao icone={<Gavel className="size-5" />} titulo="Medidas protetivas vencendo" descricao="Próximos 30 dias — avalie pedido de prorrogação." />
            {medidasVencendo.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Nenhuma medida vencendo nos próximos 30 dias.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {medidasVencendo.map(({ m, p }) => (
                  <li key={m.id}>
                    <Link href={`/prontuarios/${p.id}?aba=medidas`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <p className="truncate text-sm font-medium text-slate-900">{nomeExibicao(p)}</p>
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-800">
                        <CalendarClock className="size-3.5" /> {formatarData(m.validaAte)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>

      <Cartao>
        <CabecalhoCartao
          icone={<Users className="size-5" />}
          titulo="Atendidas recentemente pela sua unidade"
          acao={
            <BotaoLink href="/prontuarios/novo" tamanho="sm">
              <UserPlus className="size-4" /> Novo acolhimento
            </BotaoLink>
          }
        />
        {recentes.length === 0 ? (
          <Vazio titulo="Ainda não há atendimentos registrados pela unidade" />
        ) : (
          <ul className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
            {recentes.map(({ p, ultimo }) => (
              <li key={p.id} className="sm:border-b sm:border-slate-100 sm:odd:border-r">
                <Link href={`/prontuarios/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <Avatar nome={nomeExibicao(p)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{nomeExibicao(p)}</p>
                    <p className="text-xs text-slate-500">Último atendimento {tempoRelativo(ultimo)}</p>
                  </div>
                  <SeloRisco nivel={p.nivelRisco} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Sua unidade tem acesso a {ativos} prontuário{ativos === 1 ? "" : "s"} ativo{ativos === 1 ? "" : "s"} na rede.
        </p>
      </Cartao>
    </div>
  );
}

function Indicador({
  icone,
  valor,
  rotulo,
  destaque,
  alerta,
  href,
}: {
  icone: React.ReactNode;
  valor: number;
  rotulo: string;
  destaque?: boolean;
  alerta?: boolean;
  href?: string;
}) {
  const corpo = (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-xs transition-colors hover:border-lilas-200">
      <div
        className={
          "grid size-11 place-items-center rounded-xl [&>svg]:size-5 " +
          (alerta ? "bg-rose-50 text-rose-700" : destaque ? "bg-amber-50 text-amber-700" : "bg-lilas-50 text-lilas-700")
        }
      >
        {icone}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{valor}</p>
        <p className="text-xs text-slate-500">{rotulo}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{corpo}</Link> : corpo;
}
