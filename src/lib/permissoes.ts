/**
 * Regras de acesso — funções puras, testadas em tests/permissoes.test.ts.
 *
 * Princípios:
 * 1. Necessidade: uma unidade só abre o prontuário se ela abriu o caso, recebeu
 *    um encaminhamento, a mulher autorizou, ou houve acesso emergencial justificado.
 * 2. TI não lê prontuário: o papel ADMIN gerencia contas e unidades, mas nunca
 *    vê conteúdo de atendimento.
 * 3. Sigilo por registro: cada anotação pode ser da rede, só da unidade, ou só
 *    da especialidade (ex.: registros da Psicologia — Resolução CFP 01/2009).
 * 4. Recepção cadastra e acompanha encaminhamentos, mas não lê relatos.
 */
import type { Especialidade, NivelRisco, Papel, Sigilo } from "@/db/schema";

export type Ator = {
  id: string;
  papel: Papel;
  unidadeId: string;
  especialidade: Especialidade | null;
};

export type Concessao = {
  unidadeId: string;
  origem: "ORIGEM" | "ENCAMINHAMENTO" | "AUTORIZACAO" | "EMERGENCIAL";
  expiraEm: Date | null;
  revogadoEm: Date | null;
};

export type RegistroComSigilo = {
  sigilo: Sigilo;
  unidadeId: string;
  especialidade: Especialidade | null;
};

export const DURACAO_ACESSO_EMERGENCIAL_MS = 24 * 60 * 60 * 1000;

export function concessaoVigente(c: Concessao, agora = new Date()): boolean {
  if (c.revogadoEm) return false;
  return !c.expiraEm || c.expiraEm.getTime() > agora.getTime();
}

export function concessoesDaUnidade(ator: Ator, concessoes: Concessao[], agora = new Date()) {
  return concessoes.filter((c) => c.unidadeId === ator.unidadeId && concessaoVigente(c, agora));
}

export function podeAbrirProntuario(ator: Ator, concessoes: Concessao[], agora = new Date()): boolean {
  if (ator.papel === "ADMIN") return false;
  return concessoesDaUnidade(ator, concessoes, agora).length > 0;
}

/** Acesso só por "quebra de vidro" (sem vínculo regular da unidade). */
export function acessoApenasEmergencial(ator: Ator, concessoes: Concessao[], agora = new Date()): boolean {
  const vigentes = concessoesDaUnidade(ator, concessoes, agora);
  return vigentes.length > 0 && vigentes.every((c) => c.origem === "EMERGENCIAL");
}

export function ehEquipeTecnica(ator: Ator): boolean {
  return ator.papel === "GESTORA" || ator.papel === "TECNICA";
}

export const podeLerConteudoTecnico = ehEquipeTecnica;
export const podeRegistrarAtendimento = ehEquipeTecnica;
export const podeSolicitarAcessoEmergencial = ehEquipeTecnica;
export const podeAlterarConsentimento = ehEquipeTecnica;

export function podeCadastrar(ator: Ator): boolean {
  return ator.papel !== "ADMIN";
}

export function podeVerRegistro(ator: Ator, registro: RegistroComSigilo): boolean {
  if (!podeLerConteudoTecnico(ator)) return false;
  switch (registro.sigilo) {
    case "REDE":
      return true;
    case "UNIDADE":
      return registro.unidadeId === ator.unidadeId;
    case "ESPECIALIDADE":
      return ator.especialidade !== null && ator.especialidade === registro.especialidade;
  }
}

/** Sigilos que a profissional pode escolher ao registrar. */
export function sigilosPermitidos(ator: Ator): Sigilo[] {
  return ator.especialidade ? ["REDE", "UNIDADE", "ESPECIALIDADE"] : ["REDE", "UNIDADE"];
}

export function podeVerAuditoria(ator: Ator): boolean {
  return ator.papel === "ADMIN" || ator.papel === "GESTORA";
}

export function podeVerIndicadores(ator: Ator): boolean {
  return ator.papel === "ADMIN" || ator.papel === "GESTORA";
}

export function podeGerirUnidades(ator: Ator): boolean {
  return ator.papel === "ADMIN";
}

export function podeGerirUsuarios(ator: Ator, unidadeAlvoId?: string): boolean {
  if (ator.papel === "ADMIN") return true;
  if (ator.papel !== "GESTORA") return false;
  return unidadeAlvoId === undefined || unidadeAlvoId === ator.unidadeId;
}

export function papeisAtribuiveis(ator: Ator): Papel[] {
  if (ator.papel === "ADMIN") return ["ADMIN", "GESTORA", "TECNICA", "RECEPCAO"];
  if (ator.papel === "GESTORA") return ["TECNICA", "RECEPCAO"];
  return [];
}

/** Gestão da unidade de origem revisa acessos emergenciais ao "seu" prontuário. */
export function podeRevisarAcessoEmergencial(ator: Ator, unidadeOrigemId: string): boolean {
  return ator.papel === "GESTORA" && ator.unidadeId === unidadeOrigemId;
}

/** Quem pode ver a trilha de acessos de um prontuário específico. */
export function podeVerAcessosDoProntuario(ator: Ator): boolean {
  return ator.papel === "GESTORA";
}

export function riscoMaisGrave(a: NivelRisco, b: NivelRisco): NivelRisco {
  const ordem: NivelRisco[] = ["NAO_AVALIADO", "BAIXO", "MEDIO", "ELEVADO"];
  return ordem.indexOf(a) >= ordem.indexOf(b) ? a : b;
}
