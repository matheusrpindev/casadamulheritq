import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Criptografia de campo (AES-256-GCM).
 *
 * Formato gravado no banco:  v1.<iv>.<tag>.<conteúdo>   (base64url)
 *
 * Se o banco vazar (backup esquecido, acesso indevido ao servidor), relatos,
 * CPF, telefone, endereço e anotações continuam ilegíveis sem a chave, que fica
 * só na variável de ambiente CHAVE_CRIPTOGRAFIA.
 */

const VERSAO = "v1";

function lerChave(nome: "CHAVE_CRIPTOGRAFIA" | "CHAVE_INDICE"): Buffer {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`${nome} não configurada. Gere com "npm run gerar-chaves".`);
  }
  const chave = Buffer.from(valor, "base64");
  if (chave.length !== 32) {
    throw new Error(`${nome} deve ter 32 bytes em base64 (tem ${chave.length}).`);
  }
  return chave;
}

let cacheChave: Buffer | undefined;
let cacheChaveIndice: Buffer | undefined;
const chaveCifra = () => (cacheChave ??= lerChave("CHAVE_CRIPTOGRAFIA"));
const chaveIndice = () => (cacheChaveIndice ??= lerChave("CHAVE_INDICE"));

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveCifra(), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv.toString("base64url"), tag.toString("base64url"), conteudo.toString("base64url")].join(".");
}

export function decifrar(valor: string): string {
  const [versao, iv, tag, conteudo] = valor.split(".");
  if (versao !== VERSAO || !iv || !tag || conteudo === undefined) {
    throw new Error("Valor cifrado em formato desconhecido.");
  }
  const decifra = createDecipheriv("aes-256-gcm", chaveCifra(), Buffer.from(iv, "base64url"));
  decifra.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, "base64url")), decifra.final()]).toString("utf8");
}

/** Cifra se houver conteúdo; texto vazio vira null. */
export function cifrarOpcional(texto: string | null | undefined): string | null {
  const limpo = texto?.trim();
  return limpo ? cifrar(limpo) : null;
}

export function decifrarOpcional(valor: string | null | undefined): string | null {
  return valor ? decifrar(valor) : null;
}

/**
 * Índice cego: HMAC-SHA256 do valor normalizado. Permite achar um CPF exato
 * sem que o CPF fique legível no banco.
 */
export function indiceCego(valor: string): string {
  return createHmac("sha256", chaveIndice()).update(valor).digest("base64url");
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}
