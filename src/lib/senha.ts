import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const CUSTO = 12;
/** Hash de uma senha aleatória descartada — usado para igualar o tempo de resposta quando o e-mail não existe. */
export const HASH_FALSO = "$2b$12$Wk7Hsq8c5o2WhYhWsYZBjuF1CtE/sgnlgM5IJI9GSAuBdb8dI/tDy";

export const MAX_TENTATIVAS = 5;
export const MINUTOS_BLOQUEIO = 15;
export const TAMANHO_MINIMO_SENHA = 10;

export const gerarHash = (senha: string) => bcrypt.hash(senha, CUSTO);
export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash);

export function problemaNaSenha(senha: string, contexto: { email?: string; nome?: string } = {}): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) return `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  if (senha.length > 128) return "Senha longa demais.";
  if (/^(.)\1+$/.test(senha)) return "Não use um único caractere repetido.";
  const baixa = senha.toLowerCase();
  const usuarioEmail = contexto.email?.split("@")[0]?.toLowerCase();
  if (usuarioEmail && usuarioEmail.length >= 4 && baixa.includes(usuarioEmail)) return "A senha não pode conter seu e-mail.";
  const primeiroNome = contexto.nome?.split(" ")[0]?.toLowerCase();
  if (primeiroNome && primeiroNome.length >= 4 && baixa.includes(primeiroNome)) return "A senha não pode conter seu nome.";
  if (["1234567890", "0123456789", "senha12345", "itaquaquecetuba", "casadamulher"].some((c) => baixa.includes(c)))
    return "Essa senha é fácil de adivinhar. Tente uma frase com três ou quatro palavras.";
  return null;
}

/** Senha temporária legível (sem caracteres ambíguos), ex.: "lume-K7pq-vento-93". */
export function gerarSenhaTemporaria(): string {
  const palavras = ["lume", "vento", "folha", "ponte", "rio", "sol", "mar", "flor", "trilha", "aurora", "brisa", "pedra", "nuvem", "farol"];
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bloco = Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join("");
  return `${palavras[randomInt(palavras.length)]}-${bloco}-${palavras[randomInt(palavras.length)]}-${randomInt(10, 100)}`;
}
