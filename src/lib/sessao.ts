import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, lt, ne, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Ator } from "./permissoes";
import { dadosRequisicao } from "./requisicao";

export const NOME_COOKIE = "acolhe_sessao";
/** Duração máxima de uma sessão (um turno de trabalho). */
export const DURACAO_SESSAO_MS = 10 * 60 * 60 * 1000;
/** Sem nenhuma atividade por este tempo, a sessão cai no servidor. */
export const INATIVIDADE_MAXIMA_MS = 30 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

function cookieSeguro() {
  // PERMITIR_HTTP=true só para testes em rede interna sem certificado.
  if (process.env.PERMITIR_HTTP === "true") return false;
  return process.env.NODE_ENV === "production";
}

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);
  const { ip, userAgent } = await dadosRequisicao();

  await db.insert(schema.sessoes).values({ id: hashToken(token), usuarioId, expiraEm, ip, userAgent });
  // Limpeza oportunista de sessões vencidas.
  await db
    .delete(schema.sessoes)
    .where(
      or(
        lt(schema.sessoes.expiraEm, new Date()),
        lt(schema.sessoes.ultimaAtividadeEm, new Date(Date.now() - INATIVIDADE_MAXIMA_MS)),
      ),
    );

  (await cookies()).set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: cookieSeguro(),
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
}

export type UsuarioLogado = Ator & {
  nome: string;
  email: string;
  registroProfissional: string | null;
  precisaTrocarSenha: boolean;
  unidade: { id: string; nome: string; sigla: string; cor: string };
  sessaoId: string;
};

/** Lê e valida a sessão (uma vez por requisição). */
export const obterUsuario = cache(async (): Promise<UsuarioLogado | null> => {
  const token = (await cookies()).get(NOME_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);

  const [linha] = await db
    .select({
      sessao: schema.sessoes,
      usuario: schema.usuarios,
      unidade: schema.unidades,
    })
    .from(schema.sessoes)
    .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.sessoes.usuarioId))
    .innerJoin(schema.unidades, eq(schema.unidades.id, schema.usuarios.unidadeId))
    .where(eq(schema.sessoes.id, id))
    .limit(1);

  if (!linha) return null;
  const agora = Date.now();
  const vencida =
    linha.sessao.expiraEm.getTime() <= agora ||
    linha.sessao.ultimaAtividadeEm.getTime() <= agora - INATIVIDADE_MAXIMA_MS ||
    !linha.usuario.ativo ||
    !linha.unidade.ativa;
  if (vencida) {
    await db.delete(schema.sessoes).where(eq(schema.sessoes.id, id));
    return null;
  }

  if (agora - linha.sessao.ultimaAtividadeEm.getTime() > 60_000) {
    await db
      .update(schema.sessoes)
      .set({ ultimaAtividadeEm: new Date() })
      .where(eq(schema.sessoes.id, id));
  }

  const { usuario, unidade } = linha;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    especialidade: usuario.especialidade,
    registroProfissional: usuario.registroProfissional,
    unidadeId: usuario.unidadeId,
    precisaTrocarSenha: usuario.precisaTrocarSenha,
    unidade: { id: unidade.id, nome: unidade.nome, sigla: unidade.sigla, cor: unidade.cor },
    sessaoId: id,
  };
});

/** Use no início de TODA página e TODA server action protegida. */
export async function exigirUsuario(opcoes: { permitirTrocaPendente?: boolean } = {}): Promise<UsuarioLogado> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/login");
  if (usuario.precisaTrocarSenha && !opcoes.permitirTrocaPendente) redirect("/conta/senha");
  return usuario;
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(NOME_COOKIE)?.value;
  if (token) await db.delete(schema.sessoes).where(eq(schema.sessoes.id, hashToken(token)));
  jar.delete(NOME_COOKIE);
}

export async function encerrarOutrasSessoes(usuarioId: string, manterSessaoId?: string) {
  await db
    .delete(schema.sessoes)
    .where(
      manterSessaoId
        ? and(eq(schema.sessoes.usuarioId, usuarioId), ne(schema.sessoes.id, manterSessaoId))
        : eq(schema.sessoes.usuarioId, usuarioId),
    );
}
