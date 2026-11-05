import type { z } from "zod";

/** Estado devolvido pelas server actions para os formulários. */
export type EstadoAcao = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string>;
  /** Muda a cada resposta, para o formulário saber que houve novo envio. */
  marca?: number;
  /** Dados extras (ex.: senha temporária gerada). */
  dados?: Record<string, unknown>;
};

export function sucesso(mensagem?: string, dados?: Record<string, unknown>): EstadoAcao {
  return { ok: true, mensagem, dados, marca: Date.now() };
}

export function falha(erro: string, erros?: Record<string, string>): EstadoAcao {
  return { ok: false, erro, erros, marca: Date.now() };
}

export function falhaValidacao(erro: z.ZodError): EstadoAcao {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const chave = issue.path.join(".");
    if (!erros[chave]) erros[chave] = issue.message;
  }
  return falha("Confira os campos destacados.", erros);
}

/** Lê o FormData em um objeto simples; campos repetidos viram lista. */
export function lerFormulario(dados: FormData, multiplos: string[] = []): Record<string, string | string[]> {
  const saida: Record<string, string | string[]> = {};
  for (const chave of new Set(dados.keys())) {
    if (chave.startsWith("$ACTION")) continue;
    const valores = dados.getAll(chave).filter((v): v is string => typeof v === "string");
    saida[chave] = multiplos.includes(chave) ? valores : (valores[0] ?? "");
  }
  for (const m of multiplos) saida[m] ??= [];
  return saida;
}
