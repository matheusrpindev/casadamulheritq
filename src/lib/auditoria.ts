import "server-only";
import { db, schema } from "@/db";
import { dadosRequisicao } from "./requisicao";

export type AcaoAuditoria =
  | "LOGIN"
  | "LOGIN_FALHA"
  | "LOGIN_BLOQUEADO"
  | "LOGOUT"
  | "BUSCA"
  | "PRONTUARIO_CRIADO"
  | "PRONTUARIO_VISUALIZADO"
  | "PRONTUARIO_IMPRESSO"
  | "CADASTRO_ALTERADO"
  | "CONSENTIMENTO_ALTERADO"
  | "RELATO_REGISTRADO"
  | "ATENDIMENTO_REGISTRADO"
  | "RETIFICACAO"
  | "AVALIACAO_RISCO"
  | "AUTOR_REGISTRADO"
  | "MEDIDA_REGISTRADA"
  | "MEDIDA_ATUALIZADA"
  | "ENCAMINHAMENTO_CRIADO"
  | "ENCAMINHAMENTO_RECEBIDO"
  | "ENCAMINHAMENTO_CONCLUIDO"
  | "ENCAMINHAMENTO_RECUSADO"
  | "ENCAMINHAMENTO_CANCELADO"
  | "ACESSO_EMERGENCIAL"
  | "ACESSO_EMERGENCIAL_REVISADO"
  | "ACESSO_REVOGADO"
  | "PRONTUARIO_ARQUIVADO"
  | "PRONTUARIO_REATIVADO"
  | "USUARIO_CRIADO"
  | "USUARIO_ALTERADO"
  | "SENHA_REDEFINIDA"
  | "SENHA_ALTERADA"
  | "UNIDADE_CRIADA"
  | "UNIDADE_ALTERADA";

type Executor = Pick<typeof db, "insert">;

/**
 * Grava um evento na trilha de auditoria. Nunca registre conteúdo de relato ou
 * atendimento em `detalhes` — só metadados (ids, tipos, contagens).
 */
export async function registrarAuditoria(
  acao: AcaoAuditoria,
  quem: { usuarioId: string | null; unidadeId: string | null },
  extra: { prontuarioId?: string | null; alvo?: string; detalhes?: Record<string, unknown> } = {},
  executor: Executor = db,
) {
  const { ip, userAgent } = await dadosRequisicao();
  await executor.insert(schema.auditoria).values({
    acao,
    usuarioId: quem.usuarioId,
    unidadeId: quem.unidadeId,
    prontuarioId: extra.prontuarioId ?? null,
    alvo: extra.alvo,
    detalhes: extra.detalhes,
    ip,
    userAgent,
  });
}
