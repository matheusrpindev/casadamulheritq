import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Baby, Clock, Download, FilePlus2, Home, Info, Send, ShieldAlert, Siren, Users } from "lucide-react";
import { exigirUsuario } from "@/lib/sessao";
import { podeVerIndicadores } from "@/lib/permissoes";
import { carregarRelatorio, ehOculto, LIMIAR_SIGILO, type Grafico } from "@/lib/dados/relatorios";
import { formatarData } from "@/lib/texto";
import { NOME_SISTEMA } from "@/lib/config";
import { ROTULO_IDENTIDADE } from "@/lib/identidade";
import { CabecalhoCartao, Cartao, TituloPagina, classeBotao, cx } from "@/components/ui";
import { BarrasHorizontais, Colunas, Proporcao } from "@/components/graficos";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { LogoMarca } from "@/components/marca";
import { IndicadorLink } from "@/components/carregando";

export const metadata: Metadata = { title: "Relatórios" };

const COR_RISCO: Record<string, string> = { ELEVADO: "#e11d48", MEDIO: "#d97706", BAIXO: "#059669", NAO_AVALIADO: "#cbd5e1" };

export default async function PaginaRelatorios({ searchParams }: PageProps<"/relatorios">) {
  const usuario = await exigirUsuario();
  if (!podeVerIndicadores(usuario)) redirect("/");
  const sp = await searchParams;
  const meses = [3, 6, 12].includes(Number(sp.meses)) ? Number(sp.meses) : 12;
  const escopoUnidade = sp.escopo === "unidade" && usuario.papel !== "ADMIN";

  const r = await carregarRelatorio({ meses, unidadeId: escopoUnidade ? usuario.unidadeId : null });
  const t = r.totais;
  const mediana =
    t.mediana_horas === null ? "—" : t.mediana_horas < 1 ? "< 1 h" : t.mediana_horas < 48 ? `${Math.round(t.mediana_horas)} h` : `${Math.round(t.mediana_horas / 24)} dias`;
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
  const grafico = (id: string) => [...r.perfil.graficos, ...r.violencia.graficos].find((g) => g.id === id)!;
  const comFilhos = grafico("com-filhos").barras.find((b) => b.rotulo === "Sim")?.valor ?? 0;
  const comMenores = grafico("filhos-menores").barras.find((b) => b.rotulo === "Sim")?.valor ?? 0;

  const qs = (mudanca: Record<string, string>) => {
    const q = new URLSearchParams({ meses: String(meses), ...(escopoUnidade ? { escopo: "unidade" } : {}), ...mudanca });
    if (q.get("escopo") === "rede") q.delete("escopo");
    return q.toString();
  };
  const escopoTexto = r.escopo ? r.escopo.nome : "Rede toda";

  return (
    <div>
      {/* Cabeçalho só da impressão */}
      <div className="mb-6 hidden items-center gap-4 border-b-2 border-marca-600 pb-3 print:flex">
        <LogoMarca identidade={usuario.unidade.identidade} uso="horizontal" className={usuario.unidade.identidade === "SECRETARIA" ? "w-80" : "w-44"} />
        <div>
          <p className="text-lg font-bold">Relatório — {NOME_SISTEMA}</p>
          <p className="text-sm text-zinc-600">
            {ROTULO_IDENTIDADE[usuario.unidade.identidade]} · {escopoTexto} · desde {formatarData(r.desde)} ({meses} meses) · emitido em {formatarData(new Date())}
          </p>
        </div>
      </div>

      <div className="print:hidden">
        <TituloPagina
          titulo="Relatórios"
          descricao={`Números agregados para planejar a política pública e prestar contas. Nenhum dado aqui identifica uma mulher: contagens menores que ${LIMIAR_SIGILO} em categorias sensíveis aparecem como “< ${LIMIAR_SIGILO}”.`}
          acoes={
            <>
              <a href={`/relatorios/exportar?${qs({})}`} className={classeBotao("secundario", "sm")}>
                <Download className="size-4" /> Exportar CSV
              </a>
              <BotaoImprimir variante="secundario" />
            </>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          {usuario.papel !== "ADMIN" && (
            <Alternador
              opcoes={[
                { rotulo: "Rede toda", href: `/relatorios?${qs({ escopo: "rede" })}`, ativo: !escopoUnidade },
                { rotulo: usuario.unidade.sigla, href: `/relatorios?${qs({ escopo: "unidade" })}`, ativo: escopoUnidade },
              ]}
            />
          )}
          <Alternador
            opcoes={[3, 6, 12].map((m) => ({ rotulo: `${m} meses`, href: `/relatorios?${qs({ meses: String(m) })}`, ativo: m === meses }))}
          />
          <span className="text-xs text-zinc-500">desde {formatarData(r.desde)}</span>
        </div>

        <nav className="sticky top-0 z-10 -mx-1 mb-6 flex gap-1 overflow-x-auto bg-fundo/95 px-1 py-2 backdrop-blur lg:top-0" aria-label="Partes do relatório">
          {[
            { href: "#geral", rotulo: "Visão geral" },
            { href: "#perfil", rotulo: "Perfil das mulheres" },
            { href: "#violencia", rotulo: "Violência e autor" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium whitespace-nowrap text-marca-800 ring-1 ring-marca-200 hover:bg-marca-50">
              {l.rotulo}
            </a>
          ))}
        </nav>
      </div>

      {/* ------------------------------------------------------------ Visão geral */}
      <Secao id="geral" titulo="Visão geral">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Numero icone={<FilePlus2 />} valor={t.novos} rotulo="Mulheres acolhidas pela primeira vez" />
          <Numero icone={<Users />} valor={t.atendimentos} rotulo="Atendimentos registrados" />
          <Numero icone={<Send />} valor={t.encaminhamentos} rotulo="Encaminhamentos entre unidades" />
          <Numero icone={<Clock />} valor={mediana} rotulo="Tempo mediano até ela ser recebida" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao className="break-inside-avoid lg:col-span-2">
            <CabecalhoCartao titulo="Atendimentos por mês" />
            <div className="p-5">
              <Colunas barras={r.porMes} unidade=" atendimentos" />
            </div>
          </Cartao>
          <Cartao className="break-inside-avoid">
            <CabecalhoCartao titulo="Atendimentos por unidade" />
            <div className="p-5">
              <BarrasHorizontais barras={r.porUnidade} total={t.atendimentos} />
            </div>
          </Cartao>
          <Cartao className="break-inside-avoid">
            <CabecalhoCartao titulo="Risco atual dos casos ativos" descricao="Última classificação registrada (FONAR)." />
            <div className="p-5">
              <Proporcao partes={r.risco.map((x) => ({ rotulo: x.rotulo, valor: x.valor, cor: COR_RISCO[x.nivel] }))} />
              <p className="mt-4 text-xs text-zinc-500">
                {t.novos > 0 ? `${pct(t.com_risco, t.novos)} das mulheres acolhidas no período já têm avaliação de risco.` : "Sem novos acolhimentos no período."}
              </p>
            </div>
          </Cartao>
          <Cartao className="break-inside-avoid lg:col-span-2">
            <CabecalhoCartao titulo="Fluxos de encaminhamento" descricao="Origem → destino, e quantos chegaram a ser recebidos." />
            {r.fluxos.length === 0 ? (
              <p className="px-5 py-6 text-sm text-zinc-500">Sem encaminhamentos no período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr className="border-b border-zinc-100">
                    <th className="px-5 py-2 font-medium">Fluxo</th>
                    <th className="px-3 py-2 text-right font-medium">Enviados</th>
                    <th className="px-5 py-2 text-right font-medium">Recebidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {r.fluxos.map((f) => (
                    <tr key={`${f.origem}-${f.destino}`}>
                      <td className="px-5 py-2.5 text-zinc-700">
                        {f.origem} → {f.destino}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{f.total}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {f.recebidos} <span className="text-xs text-zinc-500">({pct(f.recebidos, f.total)})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Cartao>
        </div>
        <div
          className={cx(
            "mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm print:hidden",
            t.emergenciais > 0 ? "border-amber-200 bg-amber-50 text-amber-950" : "border-zinc-200 bg-white text-zinc-600",
          )}
        >
          {t.emergenciais > 0 ? <Siren className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
          <p>
            {t.emergenciais} acesso{t.emergenciais === 1 ? "" : "s"} emergencia{t.emergenciais === 1 ? "l" : "is"} no período.{" "}
            <Link href="/auditoria?acao=ACESSO_EMERGENCIAL" className="font-medium underline">
              Revisar na auditoria
            </Link>
          </p>
        </div>
      </Secao>

      {/* ------------------------------------------------------------ Perfil */}
      <Secao
        id="perfil"
        titulo="Perfil das mulheres"
        descricao={`${r.perfil.base} mulheres acolhidas pela primeira vez no período. Percentuais sobre esse total; “Não informado” mostra o que ainda falta preencher no cadastro.`}
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Numero icone={<Baby />} valor={pct(comFilhos, r.perfil.base)} rotulo={`têm filhos (${comFilhos} mulheres)`} />
          <Numero icone={<Baby />} valor={pct(comMenores, r.perfil.base)} rotulo={`têm filhos menores de 18 anos (${comMenores})`} />
          <Numero
            icone={<Home />}
            valor={pct(grafico("moradia").barras.find((b) => b.rotulo === "Mora com o autor da violência")?.valor ?? 0, r.perfil.base)}
            rotulo="moram com o autor da violência"
          />
        </div>
        <GradeGraficos graficos={r.perfil.graficos} />
      </Secao>

      {/* ------------------------------------------------------------ Violência */}
      <Secao
        id="violencia"
        titulo="Violência e autor"
        descricao="Sobre as mesmas mulheres acolhidas no período. Fatores de risco vêm da avaliação mais recente de cada uma (FONAR)."
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Numero icone={<ShieldAlert />} valor={pct(r.violencia.comAvaliacao, r.violencia.base)} rotulo={`passaram pela avaliação de risco (${r.violencia.comAvaliacao})`} />
          <Numero icone={<Home />} valor={r.violencia.aceitaAbrigamento} rotulo="disseram que aceitam abrigamento temporário" />
          <Numero icone={<Siren />} valor={r.risco.find((x) => x.nivel === "ELEVADO")?.valor ?? 0} rotulo="casos ativos com risco elevado hoje" />
        </div>
        <GradeGraficos graficos={r.violencia.graficos} />
      </Secao>
    </div>
  );
}

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-16">
      <h2 className="fonte-titulo text-xl font-bold text-marca-900">{titulo}</h2>
      {descricao && <p className="mt-1 mb-5 max-w-3xl text-sm text-zinc-600">{descricao}</p>}
      {!descricao && <div className="mb-5" />}
      {children}
    </section>
  );
}

function GradeGraficos({ graficos }: { graficos: Grafico[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {graficos.map((g) => (
        <Cartao key={g.id} className="break-inside-avoid">
          <CabecalhoCartao titulo={g.titulo} descricao={g.descricao} />
          <div className="p-5">
            <BarrasHorizontais barras={g.barras.map((b) => ({ ...b, oculto: ehOculto(g, b.valor) }))} total={g.total} />
          </div>
        </Cartao>
      ))}
    </div>
  );
}

function Alternador({ opcoes }: { opcoes: { rotulo: string; href: string; ativo: boolean }[] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-zinc-200">
      {opcoes.map((o) => (
        <Link
          key={o.rotulo}
          href={o.href}
          className={cx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
            o.ativo ? "bg-marca-600 text-white" : "text-zinc-600 hover:bg-zinc-50",
          )}
        >
          {o.rotulo} <IndicadorLink />
        </Link>
      ))}
    </div>
  );
}

function Numero({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number | string; rotulo: string }) {
  return (
    <div className="break-inside-avoid rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-xs">
      <div className="mb-2 text-marca-600 [&>svg]:size-5">{icone}</div>
      <p className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
        {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{rotulo}</p>
    </div>
  );
}
