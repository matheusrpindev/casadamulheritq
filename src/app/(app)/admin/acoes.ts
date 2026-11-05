"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { ESPECIALIDADES, PAPEIS, TIPOS_UNIDADE } from "@/db/schema";
import { registrarAuditoria } from "@/lib/auditoria";
import { falha, falhaValidacao, lerFormulario, sucesso, type EstadoAcao } from "@/lib/estado-acao";
import { papeisAtribuiveis, podeGerirUnidades, podeGerirUsuarios } from "@/lib/permissoes";
import { gerarHash, gerarSenhaTemporaria } from "@/lib/senha";
import { encerrarOutrasSessoes, exigirUsuario, type UsuarioLogado } from "@/lib/sessao";
import { ehUuid } from "@/lib/dados/prontuario";

const quem = (u: UsuarioLogado) => ({ usuarioId: u.id, unidadeId: u.unidadeId });

const esquemaUsuario = z.object({
  nome: z.string().trim().min(3, "Informe o nome.").max(120),
  email: z.email("E-mail inválido.").transform((v) => v.trim().toLowerCase()),
  papel: z.enum(PAPEIS),
  especialidade: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.enum(ESPECIALIDADES).nullable()),
  registroProfissional: z.string().trim().max(40).optional().transform((v) => v || null),
  unidadeId: z.string().optional(),
});

export async function criarUsuario(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const ator = await exigirUsuario();
  const r = esquemaUsuario.safeParse(lerFormulario(dados));
  if (!r.success) return falhaValidacao(r.error);
  const unidadeId = ator.papel === "ADMIN" ? r.data.unidadeId : ator.unidadeId;
  if (!unidadeId || !ehUuid(unidadeId)) return falha("Escolha a unidade.", { unidadeId: "Obrigatória." });
  if (!podeGerirUsuarios(ator, unidadeId)) return falha("Você não pode criar contas nesta unidade.");
  if (!papeisAtribuiveis(ator).includes(r.data.papel)) return falha("Você não pode atribuir esse perfil.");
  if (r.data.papel === "TECNICA" && !r.data.especialidade) {
    return falha("Informe a especialidade da profissional técnica.", { especialidade: "Obrigatória para equipe técnica." });
  }

  const [existe] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.email, r.data.email));
  if (existe) return falha("Já existe uma conta com esse e-mail.", { email: "Em uso." });

  const senha = gerarSenhaTemporaria();
  const [novo] = await db
    .insert(schema.usuarios)
    .values({
      nome: r.data.nome,
      email: r.data.email,
      senhaHash: await gerarHash(senha),
      papel: r.data.papel,
      especialidade: r.data.especialidade,
      registroProfissional: r.data.registroProfissional,
      unidadeId,
      precisaTrocarSenha: true,
    })
    .returning({ id: schema.usuarios.id });
  await registrarAuditoria("USUARIO_CRIADO", quem(ator), { alvo: `usuario:${novo.id}`, detalhes: { papel: r.data.papel } });
  revalidatePath("/admin/usuarios");
  return sucesso(`Conta criada para ${r.data.nome}.`, { senha, email: r.data.email });
}

async function alvoGerenciavel(ator: UsuarioLogado, usuarioId: string) {
  if (!ehUuid(usuarioId)) return null;
  const [alvo] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, usuarioId)).limit(1);
  if (!alvo || !podeGerirUsuarios(ator, alvo.unidadeId)) return null;
  if (ator.papel === "GESTORA" && !papeisAtribuiveis(ator).includes(alvo.papel)) return null;
  return alvo;
}

export async function alternarAtivo(usuarioId: string): Promise<EstadoAcao> {
  const ator = await exigirUsuario();
  if (usuarioId === ator.id) return falha("Você não pode desativar a própria conta.");
  const alvo = await alvoGerenciavel(ator, usuarioId);
  if (!alvo) return falha("Você não pode alterar esta conta.");
  await db.update(schema.usuarios).set({ ativo: !alvo.ativo }).where(eq(schema.usuarios.id, usuarioId));
  if (alvo.ativo) await encerrarOutrasSessoes(usuarioId);
  await registrarAuditoria("USUARIO_ALTERADO", quem(ator), { alvo: `usuario:${usuarioId}`, detalhes: { para: alvo.ativo ? "inativo" : "ativo" } });
  revalidatePath("/admin/usuarios");
  return sucesso(alvo.ativo ? `${alvo.nome} foi desativada e desconectada.` : `${alvo.nome} foi reativada.`);
}

export async function redefinirSenha(usuarioId: string): Promise<EstadoAcao> {
  const ator = await exigirUsuario();
  if (usuarioId === ator.id) return falha("Para trocar a sua senha, use Minha conta.");
  const alvo = await alvoGerenciavel(ator, usuarioId);
  if (!alvo) return falha("Você não pode alterar esta conta.");
  const senha = gerarSenhaTemporaria();
  await db
    .update(schema.usuarios)
    .set({ senhaHash: await gerarHash(senha), precisaTrocarSenha: true, tentativasFalhas: 0, bloqueadoAte: null })
    .where(eq(schema.usuarios.id, usuarioId));
  await encerrarOutrasSessoes(usuarioId);
  await registrarAuditoria("SENHA_REDEFINIDA", quem(ator), { alvo: `usuario:${usuarioId}` });
  revalidatePath("/admin/usuarios");
  return sucesso(`Senha temporária gerada para ${alvo.nome}.`, { senha, email: alvo.email });
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

const esquemaUnidade = z.object({
  nome: z.string().trim().min(3, "Informe o nome.").max(120),
  sigla: z.string().trim().min(2, "Informe a sigla.").max(12),
  tipo: z.enum(TIPOS_UNIDADE),
  endereco: z.string().trim().max(200).optional().transform((v) => v || null),
  telefone: z.string().trim().max(40).optional().transform((v) => v || null),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.")
    .default("#7c3aed"),
});

export async function salvarUnidade(unidadeId: string | null, _: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  const ator = await exigirUsuario();
  if (!podeGerirUnidades(ator)) return falha("Somente a administração gerencia unidades.");
  const r = esquemaUnidade.safeParse(lerFormulario(dados));
  if (!r.success) return falhaValidacao(r.error);

  if (unidadeId) {
    if (!ehUuid(unidadeId)) return falha("Unidade inválida.");
    await db.update(schema.unidades).set(r.data).where(eq(schema.unidades.id, unidadeId));
    await registrarAuditoria("UNIDADE_ALTERADA", quem(ator), { alvo: `unidade:${unidadeId}` });
  } else {
    const [n] = await db.insert(schema.unidades).values(r.data).returning({ id: schema.unidades.id });
    await registrarAuditoria("UNIDADE_CRIADA", quem(ator), { alvo: `unidade:${n.id}` });
  }
  revalidatePath("/admin/unidades");
  return sucesso(unidadeId ? "Unidade atualizada." : "Unidade cadastrada.");
}

export async function alternarUnidade(unidadeId: string): Promise<EstadoAcao> {
  const ator = await exigirUsuario();
  if (!podeGerirUnidades(ator)) return falha("Somente a administração gerencia unidades.");
  if (!ehUuid(unidadeId)) return falha("Unidade inválida.");
  if (unidadeId === ator.unidadeId) return falha("Você não pode desativar a sua própria unidade.");
  const [u] = await db.select().from(schema.unidades).where(eq(schema.unidades.id, unidadeId));
  if (!u) return falha("Unidade não encontrada.");
  await db.update(schema.unidades).set({ ativa: !u.ativa }).where(and(eq(schema.unidades.id, unidadeId)));
  await registrarAuditoria("UNIDADE_ALTERADA", quem(ator), { alvo: `unidade:${unidadeId}`, detalhes: { para: u.ativa ? "inativa" : "ativa" } });
  revalidatePath("/admin/unidades");
  return sucesso(u.ativa ? "Unidade desativada (as contas dela não conseguem mais entrar)." : "Unidade reativada.");
}
