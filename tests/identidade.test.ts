import { describe, expect, it } from "vitest";
import { IDENTIDADE_LOGIN, MARCAS, identidadePadrao } from "@/lib/identidade";

describe("identidade visual por unidade", () => {
  it("unidade do tipo Casa da Mulher começa com a identidade da Casa; as demais, com a da Secretaria", () => {
    expect(identidadePadrao("CASA_DA_MULHER")).toBe("CASA_DA_MULHER");
    for (const tipo of ["SECRETARIA", "CREAS", "CRAS", "DELEGACIA", "SAUDE", "JURIDICO", "ABRIGO", "OUTRO"]) {
      expect(identidadePadrao(tipo)).toBe("SECRETARIA");
    }
  });

  it("a tela de login usa sempre a identidade da Secretaria", () => {
    expect(IDENTIDADE_LOGIN).toBe("SECRETARIA");
  });

  it("toda identidade tem logos e ícone em /marca", () => {
    for (const m of Object.values(MARCAS)) {
      for (const img of [m.menu, m.horizontal, m.destaque]) expect(img.src).toMatch(/^\/marca\//);
      expect(m.icone).toMatch(/^\/marca\//);
      expect(m.faixa.length).toBeGreaterThan(2);
    }
  });
});
