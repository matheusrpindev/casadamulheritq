import { describe, expect, it } from "vitest";
import { gerarCasos } from "../scripts/gerador-casos";
import { limparRespostas } from "@/lib/fonar";
import { faixaEtaria } from "@/lib/relatorios";

const HOJE = new Date("2026-11-05T12:00:00Z");
const casos = gerarCasos(150, HOJE);

describe("base fictícia de validação", () => {
  it("é determinística: mesma semente, mesmos casos", () => {
    expect(gerarCasos(150, HOJE)).toEqual(casos);
  });

  it("não repete nomes", () => {
    expect(new Set(casos.map((c) => c.nomeCivil)).size).toBe(casos.length);
  });

  it("filhos menores nunca passam do total de filhos", () => {
    for (const c of casos) {
      const { quantidadeFilhos: t, filhosMenores: m } = c.perfil;
      if (t !== null && m !== null) expect(m).toBeLessThanOrEqual(t);
      if (t === 0) expect(m).toBe(0);
    }
  });

  it("gestação só em idade fértil", () => {
    for (const c of casos.filter((c) => c.perfil.gestante)) {
      expect(c.idade).toBeGreaterThanOrEqual(16);
      expect(c.idade).toBeLessThanOrEqual(42);
    }
  });

  it("autor 'filho' só para mulheres mais velhas que têm filhos", () => {
    for (const c of casos.filter((c) => c.autor?.vinculo === "FILHO")) {
      expect(c.idade).toBeGreaterThanOrEqual(42);
      expect(c.perfil.quantidadeFilhos).toBeGreaterThan(0);
    }
  });

  it("'mora com o autor' só quando o vínculo permite convivência", () => {
    for (const c of casos.filter((c) => c.perfil.situacaoMoradia === "Mora com o autor da violência")) {
      expect(["CONJUGE_COMPANHEIRO", "FILHO", "IRMAO", "OUTRO_FAMILIAR", "PAI_PADRASTO"]).toContain(c.autor?.vinculo);
    }
  });

  it("respostas do FONAR são válidas e batem com o cadastro", () => {
    for (const c of casos.filter((c) => c.fonar)) {
      const r = c.fonar!.respostas;
      expect(limparRespostas(r)).toEqual(r);
      expect(r.q17[0] === "nao").toBe(!c.perfil.quantidadeFilhos);
      expect(r.q5[0] === "sim").toBe(c.tipos.includes("SEXUAL"));
      expect(r.q26[0] === "sim").toBe(c.perfil.dependenciaFinanceira === true);
      expect(r.q22[0] === "sim").toBe(c.perfil.pessoaComDeficiencia === true);
      // Ameaça com arma de fogo só quando o autor tem (ou pode ter) acesso a uma.
      if (r.q1.includes("arma_fogo")) expect(c.autor?.acessoArma).not.toBe("NAO");
    }
  });

  it("cobre todas as faixas etárias adultas e tem casos com e sem filhos", () => {
    const faixas = new Set(casos.map((c) => faixaEtaria(c.idade)));
    for (const f of ["18 a 24", "25 a 34", "35 a 44", "45 a 59", "60 ou mais"]) expect(faixas).toContain(f);
    const comFilhos = casos.filter((c) => (c.perfil.quantidadeFilhos ?? 0) > 0).length / casos.length;
    expect(comFilhos).toBeGreaterThan(0.55);
    expect(comFilhos).toBeLessThan(0.95);
  });

  it("nenhuma unidade encaminha para ela mesma", () => {
    for (const c of casos.filter((c) => c.encaminhamento)) expect(c.encaminhamento!.destino).not.toBe(c.origem);
  });

  it("todo caso tem ao menos uma forma de violência e um atendimento", () => {
    for (const c of casos) {
      expect(c.tipos.length).toBeGreaterThan(0);
      expect(c.atendimentos.length).toBeGreaterThan(0);
    }
  });
});
