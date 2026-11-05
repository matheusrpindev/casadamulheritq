"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { registrarAuditoria } from "@/lib/auditoria";
import { falha, type EstadoAcao } from "@/lib/estado-acao";
import { conferirSenha, gerarHash, problemaNaSenha } from "@/lib/senha";
import { encerrarOutrasSessoes, exigirUsuario } from "@/lib/sessao";

export async function trocarSenha(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });
  const atual = String(dados.get("atual") ?? "");
  const nova = String(dados.get("nova") ?? "");
  const confirmacao = String(dados.get("confirmacao") ?? "");

  const [linha] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, usuario.id)).limit(1);
  if (!linha || !(await conferirSenha(atual, linha.senhaHash))) return falha("A senha atual não confere.", { atual: "Incorreta." });
  if (nova !== confirmacao) return falha("A confirmação é diferente da nova senha.", { confirmacao: "Não confere." });
  if (nova === atual) return falha("A nova senha precisa ser diferente da atual.", { nova: "Igual à atual." });
  const problema = problemaNaSenha(nova, { email: usuario.email, nome: usuario.nome });
  if (problema) return falha(problema, { nova: problema });

  await db
    .update(schema.usuarios)
    .set({ senhaHash: await gerarHash(nova), precisaTrocarSenha: false })
    .where(eq(schema.usuarios.id, usuario.id));
  await encerrarOutrasSessoes(usuario.id, usuario.sessaoId);
  await registrarAuditoria("SENHA_ALTERADA", { usuarioId: usuario.id, unidadeId: usuario.unidadeId });
  redirect(usuario.papel === "ADMIN" ? "/admin/usuarios" : "/");
}
