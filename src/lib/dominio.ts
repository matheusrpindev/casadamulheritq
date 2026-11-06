/** Valores de domínio (sem dependências — podem ser usados no navegador). */
export const TIPOS_UNIDADE = [
  "CASA_DA_MULHER",
  "SECRETARIA",
  "CREAS",
  "CRAS",
  "DELEGACIA",
  "SAUDE",
  "JURIDICO",
  "ABRIGO",
  "CENTRO_DIREITOS_HUMANOS",
  "OUTRO",
] as const;

export const PAPEIS = ["ADMIN", "GESTORA", "TECNICA", "RECEPCAO"] as const;

export const ESPECIALIDADES = [
  "PSICOLOGIA",
  "SERVICO_SOCIAL",
  "JURIDICO",
  "SAUDE",
  "ACOLHIMENTO",
  "ADMINISTRATIVO",
  "OUTRA",
] as const;

export const STATUS_PRONTUARIO = ["ATIVO", "ARQUIVADO"] as const;

export const NIVEIS_RISCO = ["NAO_AVALIADO", "BAIXO", "MEDIO", "ELEVADO"] as const;

export const SIGILOS = ["REDE", "UNIDADE", "ESPECIALIDADE"] as const;

export const TIPOS_ATENDIMENTO = [
  "ACOLHIMENTO",
  "PSICOLOGICO",
  "SOCIAL",
  "JURIDICO",
  "SAUDE",
  "RETORNO",
  "CONTATO_TELEFONICO",
  "VISITA",
  "GRUPO",
  "OUTRO",
] as const;

/** Formas de violência — Lei Maria da Penha (Lei 11.340/2006), art. 7º. */
export const TIPOS_VIOLENCIA = [
  "FISICA",
  "PSICOLOGICA",
  "SEXUAL",
  "PATRIMONIAL",
  "MORAL",
  "OUTRA",
] as const;

export const URGENCIAS = ["ROTINA", "PRIORITARIA", "URGENTE"] as const;

export const STATUS_ENCAMINHAMENTO = [
  "ENVIADO",
  "RECEBIDO",
  "CONCLUIDO",
  "RECUSADO",
  "CANCELADO",
] as const;

export const ORIGENS_ACESSO = ["ORIGEM", "ENCAMINHAMENTO", "AUTORIZACAO", "EMERGENCIAL"] as const;

export const STATUS_MEDIDA = [
  "SOLICITADA",
  "DEFERIDA",
  "INDEFERIDA",
  "REVOGADA",
  "ENCERRADA",
] as const;

export const VINCULOS_AUTOR = [
  "CONJUGE_COMPANHEIRO",
  "EX_CONJUGE_COMPANHEIRO",
  "NAMORADO",
  "EX_NAMORADO",
  "PAI_PADRASTO",
  "MAE_MADRASTA",
  "FILHO",
  "IRMAO",
  "OUTRO_FAMILIAR",
  "CONHECIDO",
  "DESCONHECIDO",
  "OUTRO",
] as const;

export type TipoViolencia = (typeof TIPOS_VIOLENCIA)[number];
/** Identidade visual mostrada a quem é da unidade (logos, cores e fonte). */
export const IDENTIDADES = ["CASA_DA_MULHER", "SECRETARIA", "CENTRO_DIREITOS_HUMANOS"] as const;
export type Identidade = (typeof IDENTIDADES)[number];

export type Papel = (typeof PAPEIS)[number];
export type Especialidade = (typeof ESPECIALIDADES)[number];
export type Sigilo = (typeof SIGILOS)[number];
export type NivelRisco = (typeof NIVEIS_RISCO)[number];
