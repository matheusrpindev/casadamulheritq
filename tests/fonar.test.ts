import { describe, expect, it } from "vitest";
import { avaliarFonar, limparRespostas, PERGUNTAS } from "@/lib/fonar";

describe("FONAR — sugestão de risco", () => {
  it("sem fatores, sugere risco baixo", () => {
    const r = avaliarFonar({ q5: ["nao"], q9: ["nao"], q16: ["nao"] });
    expect(r.sugestao).toBe("BAIXO");
    expect(r.fatoresGraves).toEqual([]);
    expect(r.respondidas).toBe(3);
  });

  it("estrangulamento é crítico: sozinho já sugere risco elevado", () => {
    const r = avaliarFonar({ q2: ["enforcamento"] });
    expect(r.sugestao).toBe("ELEVADO");
    expect(r.criticos).toContain("Enforcamento/estrangulamento");
  });

  it("ameaça com arma de fogo é crítica", () => {
    expect(avaliarFonar({ q14: ["ameacou"] }).sugestao).toBe("ELEVADO");
  });

  it("três fatores graves não críticos sugerem risco elevado", () => {
    const r = avaliarFonar({ q9: ["sim"], q16: ["sim"], q20: ["sim"] });
    expect(r.fatoresGraves).toHaveLength(3);
    expect(r.sugestao).toBe("ELEVADO");
  });

  it("um fator grave sugere risco médio", () => {
    expect(avaliarFonar({ q16: ["sim"] }).sugestao).toBe("MEDIO");
  });

  it("três fatores de atenção sugerem risco médio", () => {
    const r = avaliarFonar({ q6: ["sim"], q26: ["sim"], q19: ["sim"] });
    expect(r.fatoresGraves).toHaveLength(0);
    expect(r.fatoresAtencao).toHaveLength(3);
    expect(r.sugestao).toBe("MEDIO");
  });

  it("o mesmo fator não conta duas vezes", () => {
    const r = avaliarFonar({ q3: ["socos", "chutes", "tapas"] });
    expect(r.fatoresAtencao).toEqual(["Agressões físicas"]);
  });

  it("detecta quando ela aceita abrigamento", () => {
    expect(avaliarFonar({ q27: ["sim"] }).aceitaAbrigamento).toBe(true);
  });
});

describe("FONAR — limpeza das respostas", () => {
  it("descarta perguntas e opções inexistentes", () => {
    expect(limparRespostas({ q1: ["inventada"], qX: ["sim"] })).toEqual({});
  });

  it("opção exclusiva não convive com outras", () => {
    expect(limparRespostas({ q2: ["nenhuma", "tiro"] })).toEqual({ q2: ["tiro"] });
  });

  it("pergunta de resposta única guarda só uma", () => {
    expect(limparRespostas({ q5: ["sim", "nao"] })).toEqual({ q5: ["sim"] });
  });

  it("formulário tem as 27 perguntas da Parte I (+ subitens 17.1 e 17.2)", () => {
    expect(PERGUNTAS).toHaveLength(29);
    expect(new Set(PERGUNTAS.map((p) => p.id)).size).toBe(29);
  });
});
