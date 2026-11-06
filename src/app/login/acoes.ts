"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { falha, type EstadoAcao } from "@/lib/estado-acao";
import { HASH_FALSO, MAX_TENTATIVAS, MINUTOS_BLOQUEIO, conferirSenha } from "@/lib/senha";
import { criarSessao, lembrarIdentidade } from "@/lib/sessao";

const ERRO_GENERICO = "E-mail ou senha incorretos.";

export async function entrar(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const senha = String(dados.get("senha") ?? "").slice(0, 200);
  if (!email || !senha) return falha("Informe e-mail e senha.");

  let resultado: EstadoAcao | { destino: string };
  try {
    resultado = await autenticar(email, senha);
  } catch (e) {
    // Banco fora do ar ou mal configurado: mensagem clara na tela, detalhes no log do servidor.
    console.error("[login] Falha ao acessar o banco de dados:", e instanceof Error && e.cause ? e.cause : e);
    return falha(
      "Não foi possível acessar o banco de dados agora. Tente de novo em instantes; se continuar, avise a administração do sistema (no computador de quem instalou: npm run db:verificar).",
    );
  }
  if ("destino" in resultado) redirect(resultado.destino);
  return resultado;
}

async function autenticar(email: string, senha: string): Promise<EstadoAcao | { destino: string }> {
  const [usuario] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email)).limit(1);

  if (!usuario) {
    await conferirSenha(senha, HASH_FALSO); // mesmo tempo de resposta: não revela se o e-mail existe
    await registrarAuditoria("LOGIN_FALHA", { usuarioId: null, unidadeId: null }, { detalhes: { email } });
    return falha(ERRO_GENERICO);
  }

  const quem = { usuarioId: usuario.id, unidadeId: usuario.unidadeId };

  if (usuario.bloqueadoAte && usuario.bloqueadoAte.getTime() > Date.now()) {
    const minutos = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60000);
    return falha(
      `Acesso bloqueado temporariamente por excesso de tentativas. Tente de novo em ${minutos} min ou peça à gestão para redefinir sua senha.`,
    );
  }

  const confere = await conferirSenha(senha, usuario.senhaHash);
  if (!confere) {
    const tentativas = usuario.tentativasFalhas + 1;
    const bloquear = tentativas >= MAX_TENTATIVAS;
    await db
      .update(schema.usuarios)
      .set({
        tentativasFalhas: bloquear ? 0 : tentativas,
        bloqueadoAte: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEIO * 60000) : usuario.bloqueadoAte,
      })
      .where(eq(schema.usuarios.id, usuario.id));
    await registrarAuditoria(bloquear ? "LOGIN_BLOQUEADO" : "LOGIN_FALHA", quem, { detalhes: { tentativas } });
    return falha(
      bloquear ? `Muitas tentativas. Acesso bloqueado por ${MINUTOS_BLOQUEIO} minutos.` : ERRO_GENERICO,
    );
  }

  if (!usuario.ativo) return falha("Esta conta está desativada. Procure a gestão da sua unidade.");
  const [unidade] = await db.select().from(schema.unidades).where(eq(schema.unidades.id, usuario.unidadeId));
  if (!unidade?.ativa) return falha("Sua unidade está desativada no sistema. Procure a administração.");

  await db
    .update(schema.usuarios)
    .set({ tentativasFalhas: 0, bloqueadoAte: null, ultimoAcessoEm: new Date() })
    .where(eq(schema.usuarios.id, usuario.id));
  await criarSessao(usuario.id);
  await lembrarIdentidade(unidade.identidade);
  await registrarAuditoria("LOGIN", quem);

  return { destino: usuario.precisaTrocarSenha ? "/conta/senha" : usuario.papel === "ADMIN" ? "/admin/usuarios" : "/" };
}
