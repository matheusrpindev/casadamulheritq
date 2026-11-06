import { exigirUsuario } from "@/lib/sessao";
import { podeVerIndicadores } from "@/lib/permissoes";
import { registrarAuditoria } from "@/lib/auditoria";
import { carregarRelatorio, ehOculto, LIMIAR_SIGILO, type Grafico } from "@/lib/dados/relatorios";
import { formatarData, hojeISO } from "@/lib/texto";
import { NOME_SISTEMA } from "@/lib/config";
import { ROTULO_IDENTIDADE } from "@/lib/identidade";

/**
 * Exporta o relatório AGREGADO em CSV (separador ";" e BOM, para abrir direto no Excel).
 * Não contém nenhum dado individual; contagens pequenas seguem ocultas como na tela.
 */
export async function GET(request: Request) {
  const usuario = await exigirUsuario();
  if (!podeVerIndicadores(usuario)) return new Response("Sem permissão.", { status: 403 });

  const url = new URL(request.url);
  const meses = [3, 6, 12].includes(Number(url.searchParams.get("meses"))) ? Number(url.searchParams.get("meses")) : 12;
  const escopoUnidade = url.searchParams.get("escopo") === "unidade" && usuario.papel !== "ADMIN";
  const r = await carregarRelatorio({ meses, unidadeId: escopoUnidade ? usuario.unidadeId : null });

  const celula = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas: (string | number)[][] = [
    ["Relatório", `${NOME_SISTEMA} — ${ROTULO_IDENTIDADE[usuario.unidade.identidade]}`],
    ["Escopo", r.escopo ? r.escopo.nome : "Rede toda"],
    ["Período", `desde ${formatarData(r.desde)} (${meses} meses)`],
    ["Emitido em", formatarData(new Date())],
    ["Observação", `Contagens menores que ${LIMIAR_SIGILO} em categorias sensíveis aparecem como "<${LIMIAR_SIGILO}" para proteger a identidade das mulheres.`],
    [],
    ["Seção", "Indicador", "Categoria", "Valor", "Percentual"],
  ];
  const pct = (v: number, total?: number) => (total ? `${Math.round((v / total) * 100)}%` : "");

  const t = r.totais;
  linhas.push(
    ["Visão geral", "Mulheres acolhidas pela primeira vez", "", t.novos, ""],
    ["Visão geral", "Atendimentos registrados", "", t.atendimentos, ""],
    ["Visão geral", "Encaminhamentos entre unidades", "", t.encaminhamentos, ""],
    ["Visão geral", "Tempo mediano até ser recebida (horas)", "", t.mediana_horas === null ? "" : Math.round(t.mediana_horas), ""],
    ["Visão geral", "Acessos emergenciais", "", t.emergenciais, ""],
  );
  for (const m of r.porMes) linhas.push(["Visão geral", "Atendimentos por mês", m.mes, m.valor, ""]);
  for (const u of r.porUnidade) linhas.push(["Visão geral", "Atendimentos por unidade", u.rotulo, u.valor, pct(u.valor, t.atendimentos)]);
  for (const x of r.risco) linhas.push(["Visão geral", "Risco atual dos casos ativos", x.rotulo, x.valor, ""]);
  for (const f of r.fluxos) {
    linhas.push(["Visão geral", "Encaminhamentos enviados", `${f.origem} → ${f.destino}`, f.total, ""]);
    linhas.push(["Visão geral", "Encaminhamentos recebidos", `${f.origem} → ${f.destino}`, f.recebidos, pct(f.recebidos, f.total)]);
  }

  const secao = (nome: string, graficos: Grafico[]) => {
    for (const g of graficos) {
      for (const b of g.barras) {
        const oculto = ehOculto(g, b.valor);
        linhas.push([nome, g.titulo, b.rotulo, oculto ? `<${LIMIAR_SIGILO}` : b.valor, oculto ? "" : pct(b.valor, g.total)]);
      }
    }
  };
  linhas.push(["Perfil das mulheres", "Mulheres acolhidas no período (base)", "", r.perfil.base, ""]);
  secao("Perfil das mulheres", r.perfil.graficos);
  linhas.push(["Violência e autor", "Com avaliação de risco", "", r.violencia.comAvaliacao, pct(r.violencia.comAvaliacao, r.violencia.base)]);
  linhas.push(["Violência e autor", "Aceitam abrigamento temporário", "", r.violencia.aceitaAbrigamento, ""]);
  secao("Violência e autor", r.violencia.graficos);

  await registrarAuditoria(
    "RELATORIO_EXPORTADO",
    { usuarioId: usuario.id, unidadeId: usuario.unidadeId },
    { detalhes: { meses, escopo: escopoUnidade ? "unidade" : "rede" } },
  );

  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-acolhe-${hojeISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
