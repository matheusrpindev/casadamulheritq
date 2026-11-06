import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { IDENTIDADE_LOGIN, IDENTIDADES, MARCAS, ROTULO_CURTO_IDENTIDADE, ROTULO_IDENTIDADE, identidadePadrao } from "@/lib/identidade";

describe("identidade visual por unidade", () => {
  it("unidade do tipo Casa da Mulher começa com a identidade da Casa; as demais, com a da Secretaria", () => {
    expect(identidadePadrao("CASA_DA_MULHER")).toBe("CASA_DA_MULHER");
    expect(identidadePadrao("CENTRO_DIREITOS_HUMANOS")).toBe("CENTRO_DIREITOS_HUMANOS");
    for (const tipo of ["SECRETARIA", "CREAS", "CRAS", "DELEGACIA", "SAUDE", "JURIDICO", "ABRIGO", "OUTRO"]) {
      expect(identidadePadrao(tipo)).toBe("SECRETARIA");
    }
  });

  it("a tela de login usa sempre a identidade da Secretaria", () => {
    expect(IDENTIDADE_LOGIN).toBe("SECRETARIA");
  });

  it("toda identidade tem nomes, logos e ícone (e os arquivos existem em public/marca)", () => {
    for (const i of IDENTIDADES) {
      const m = MARCAS[i];
      expect(ROTULO_IDENTIDADE[i]).toBeTruthy();
      expect(ROTULO_CURTO_IDENTIDADE[i]).toBeTruthy();
      for (const arquivo of [m.menu.src, m.horizontal.src, m.destaque.src, m.icone]) {
        expect(arquivo).toMatch(/^\/marca\//);
        expect(existsSync(join("public", arquivo)), arquivo).toBe(true);
      }
      expect(m.faixa.length).toBeGreaterThan(2);
    }
  });
});
