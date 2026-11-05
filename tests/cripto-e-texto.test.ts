import { describe, expect, it } from "vitest";
import { cifrar, cifrarOpcional, decifrar, indiceCego } from "@/lib/cripto";
import { cpfValido, idade, mascararCpf, normalizarBusca, numeroProntuario } from "@/lib/texto";
import { problemaNaSenha } from "@/lib/senha";

describe("criptografia de campo", () => {
  it("cifra e decifra preservando acentos e quebras de linha", () => {
    const texto = "Ela contou que ele a ameaçou.\nDisse: “não vai ficar assim”.";
    const c = cifrar(texto);
    expect(c.startsWith("v1.")).toBe(true);
    expect(c).not.toContain("ameaçou");
    expect(decifrar(c)).toBe(texto);
  });

  it("o mesmo texto gera cifras diferentes (IV aleatório)", () => {
    expect(cifrar("igual")).not.toBe(cifrar("igual"));
  });

  it("detecta adulteração do conteúdo cifrado", () => {
    const [v, iv, tag, conteudo] = cifrar("relato").split(".");
    const adulterado = [v, iv, tag, conteudo.slice(0, -2) + (conteudo.endsWith("A") ? "BB" : "AA")].join(".");
    expect(() => decifrar(adulterado)).toThrow();
  });

  it("texto vazio não é gravado", () => {
    expect(cifrarOpcional("   ")).toBeNull();
    expect(cifrarOpcional(null)).toBeNull();
  });

  it("índice cego é determinístico e não revela o CPF", () => {
    expect(indiceCego("52998224725")).toBe(indiceCego("52998224725"));
    expect(indiceCego("52998224725")).not.toContain("529982");
  });
});

describe("texto", () => {
  it("normaliza nomes para busca (sem acento, minúsculas)", () => {
    expect(normalizarBusca("  Antônia   RODRIGUES-Silva ")).toBe("antonia rodrigues silva");
  });

  it("valida CPF pelos dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
  });

  it("mascara CPF", () => {
    expect(mascararCpf("52998224725")).toBe("***.***.*47-25");
  });

  it("calcula idade considerando o aniversário", () => {
    expect(idade("1991-03-14", new Date(2026, 2, 13))).toBe(34);
    expect(idade("1991-03-14", new Date(2026, 2, 14))).toBe(35);
  });

  it("formata número do prontuário", () => {
    expect(numeroProntuario(42, "2026-05-01T12:00:00Z")).toBe("ITQ-2026-000042");
  });
});

describe("política de senha", () => {
  it("exige tamanho mínimo e recusa senhas óbvias", () => {
    expect(problemaNaSenha("curta")).not.toBeNull();
    expect(problemaNaSenha("casadamulher2026")).not.toBeNull();
    expect(problemaNaSenha("carla.nunes.2026", { email: "carla.nunes@x.br" })).not.toBeNull();
    expect(problemaNaSenha("girassol azul na janela")).toBeNull();
  });
});
