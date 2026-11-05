/**
 * Esquema do banco — Prontuário Único da Rede de Atendimento à Mulher.
 *
 * Convenções:
 * - Campos terminados em `Cifrado` guardam texto criptografado com AES-256-GCM
 *   (ver src/lib/cripto.ts). Nunca são lidos em SQL, só no servidor da aplicação.
 * - Relatos, atendimentos e avaliações são "somente acréscimo": não se edita nem
 *   apaga. Correções viram uma retificação nova que aponta para o registro original.
 * - A tabela `auditoria` é imutável (trigger no banco bloqueia UPDATE/DELETE).
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  serial,
  bigserial,
  date,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  TIPOS_UNIDADE,
  PAPEIS,
  ESPECIALIDADES,
  STATUS_PRONTUARIO,
  NIVEIS_RISCO,
  SIGILOS,
  TIPOS_ATENDIMENTO,
  TIPOS_VIOLENCIA,
  URGENCIAS,
  STATUS_ENCAMINHAMENTO,
  ORIGENS_ACESSO,
  STATUS_MEDIDA,
  VINCULOS_AUTOR,
} from "../lib/dominio";

export * from "../lib/dominio";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const tipoUnidade = pgEnum("tipo_unidade", TIPOS_UNIDADE);

export const papel = pgEnum("papel", PAPEIS);

export const especialidade = pgEnum("especialidade", ESPECIALIDADES);

export const statusProntuario = pgEnum("status_prontuario", STATUS_PRONTUARIO);

export const nivelRisco = pgEnum("nivel_risco", NIVEIS_RISCO);

export const sigilo = pgEnum("sigilo", SIGILOS);

export const tipoAtendimento = pgEnum("tipo_atendimento", TIPOS_ATENDIMENTO);


export const urgencia = pgEnum("urgencia", URGENCIAS);

export const statusEncaminhamento = pgEnum("status_encaminhamento", STATUS_ENCAMINHAMENTO);

export const origemAcesso = pgEnum("origem_acesso", ORIGENS_ACESSO);

export const statusMedida = pgEnum("status_medida", STATUS_MEDIDA);

export const vinculoAutor = pgEnum("vinculo_autor", VINCULOS_AUTOR);

const criadoEm = () => timestamp({ withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Rede: unidades e pessoas que trabalham nela
// ---------------------------------------------------------------------------

export const unidades = pgTable("unidades", {
  id: uuid().primaryKey().defaultRandom(),
  nome: text().notNull(),
  sigla: text().notNull(),
  tipo: tipoUnidade().notNull(),
  endereco: text(),
  telefone: text(),
  /** Cor de identificação na linha do tempo (hex). */
  cor: text().notNull().default("#7c3aed"),
  ativa: boolean().notNull().default(true),
  criadoEm: criadoEm(),
});

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    email: text().notNull(),
    senhaHash: text().notNull(),
    papel: papel().notNull(),
    especialidade: especialidade(),
    /** CRP, CRESS, OAB etc. */
    registroProfissional: text(),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    ativo: boolean().notNull().default(true),
    precisaTrocarSenha: boolean().notNull().default(true),
    tentativasFalhas: integer().notNull().default(0),
    bloqueadoAte: timestamp({ withTimezone: true }),
    ultimoAcessoEm: timestamp({ withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("usuarios_email_uk").on(t.email)],
);

export const sessoes = pgTable(
  "sessoes",
  {
    /** SHA-256 do token do cookie — o token em si nunca é gravado. */
    id: text().primaryKey(),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    criadaEm: criadoEm(),
    expiraEm: timestamp({ withTimezone: true }).notNull(),
    ultimaAtividadeEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ip: text(),
    userAgent: text(),
  },
  (t) => [index("sessoes_usuario_idx").on(t.usuarioId)],
);

// ---------------------------------------------------------------------------
// Prontuário único da mulher
// ---------------------------------------------------------------------------

export const prontuarios = pgTable(
  "prontuarios",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Número sequencial legível (exibido como ITQ-2026-000042). */
    numero: serial().notNull(),

    // Identificação (texto claro: necessário para busca e confirmação de identidade)
    nomeCivil: text().notNull(),
    nomeSocial: text(),
    /** Nome civil + social normalizados (minúsculas, sem acento) para busca. */
    nomeBusca: text().notNull(),
    dataNascimento: date({ mode: "string" }),

    // Documento — cifrado + índice cego (HMAC) para busca exata
    cpfCifrado: text(),
    cpfIndice: text(),

    identidadeGenero: text(),
    racaCor: text(),
    escolaridade: text(),
    ocupacao: text(),

    // Contato seguro — ligar para ela pode colocá-la em risco
    telefoneCifrado: text(),
    contatoSeguro: boolean().notNull().default(true),
    podeDeixarRecado: boolean().notNull().default(false),
    melhorHorario: text(),
    orientacoesContatoCifrado: text(),

    enderecoCifrado: text(),
    /** Bairro em texto claro: usado só em indicadores agregados. */
    bairro: text(),

    // Consentimento para compartilhar com a rede
    compartilhamentoAutorizado: boolean().notNull().default(false),
    consentimentoRegistradoEm: timestamp({ withTimezone: true }),
    consentimentoRegistradoPorId: uuid().references(() => usuarios.id),

    status: statusProntuario().notNull().default("ATIVO"),
    nivelRisco: nivelRisco().notNull().default("NAO_AVALIADO"),
    riscoAtualizadoEm: timestamp({ withTimezone: true }),

    unidadeOrigemId: uuid()
      .notNull()
      .references(() => unidades.id),
    criadoPorId: uuid()
      .notNull()
      .references(() => usuarios.id),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("prontuarios_numero_uk").on(t.numero),
    index("prontuarios_cpf_idx").on(t.cpfIndice),
    index("prontuarios_nascimento_idx").on(t.dataNascimento),
  ],
);

/** Quais unidades podem abrir cada prontuário (princípio da necessidade). */
export const acessos = pgTable(
  "acessos",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    origem: origemAcesso().notNull(),
    /** Obrigatória no acesso emergencial ("quebra de vidro"). */
    justificativa: text(),
    /** Quem gerou o acesso (no emergencial, a profissional que pediu). */
    concedidoPorId: uuid().references(() => usuarios.id),
    criadoEm: criadoEm(),
    /** Acesso emergencial expira sozinho (24 h). */
    expiraEm: timestamp({ withTimezone: true }),
    revogadoEm: timestamp({ withTimezone: true }),
    /** Revisão da gestão sobre um acesso emergencial. */
    revisadoPorId: uuid().references(() => usuarios.id),
    revisadoEm: timestamp({ withTimezone: true }),
  },
  (t) => [index("acessos_prontuario_unidade_idx").on(t.prontuarioId, t.unidadeId)],
);

/** Autor(es) da violência. Dados de terceiro: cifrados. */
export const autores = pgTable(
  "autores",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    nomeCifrado: text().notNull(),
    vinculo: vinculoAutor().notNull(),
    /** SIM | NAO | NAO_SABE */
    acessoArma: text().notNull().default("NAO_SABE"),
    observacoesCifrado: text(),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    criadoPorId: uuid()
      .notNull()
      .references(() => usuarios.id),
    criadoEm: criadoEm(),
  },
  (t) => [index("autores_prontuario_idx").on(t.prontuarioId)],
);

/**
 * Relato: o que ela contou, registrado UMA vez na escuta qualificada.
 * É o coração do prontuário — a próxima unidade lê em vez de perguntar de novo.
 */
export const relatos = pgTable(
  "relatos",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    autorId: uuid()
      .notNull()
      .references(() => usuarios.id),
    especialidade: especialidade(),
    dataFato: date({ mode: "string" }),
    localFatoCifrado: text(),
    tiposViolencia: text().array().notNull().default([]),
    textoCifrado: text().notNull(),
    sigilo: sigilo().notNull().default("REDE"),
    retificaId: uuid().references((): AnyPgColumn => relatos.id),
    motivoRetificacao: text(),
    criadoEm: criadoEm(),
  },
  (t) => [index("relatos_prontuario_idx").on(t.prontuarioId)],
);

/** Atendimento / evolução feita por qualquer unidade da rede. */
export const atendimentos = pgTable(
  "atendimentos",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    profissionalId: uuid()
      .notNull()
      .references(() => usuarios.id),
    especialidade: especialidade(),
    tipo: tipoAtendimento().notNull(),
    realizadoEm: timestamp({ withTimezone: true }).notNull(),
    textoCifrado: text().notNull(),
    sigilo: sigilo().notNull().default("REDE"),
    retificaId: uuid().references((): AnyPgColumn => atendimentos.id),
    motivoRetificacao: text(),
    criadoEm: criadoEm(),
  },
  (t) => [index("atendimentos_prontuario_idx").on(t.prontuarioId)],
);

/**
 * Formulário Nacional de Avaliação de Risco (FONAR) — Lei 14.149/2021 e
 * Resolução Conjunta CNJ/CNMP nº 5/2020. Respostas cifradas (JSON).
 */
export const avaliacoesRisco = pgTable(
  "avaliacoes_risco",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    profissionalId: uuid()
      .notNull()
      .references(() => usuarios.id),
    respostasCifrado: text().notNull(),
    /** Quantidade de fatores de risco grave identificados (não sensível). */
    fatoresGraves: integer().notNull().default(0),
    sugestao: nivelRisco().notNull(),
    classificacao: nivelRisco().notNull(),
    justificativaCifrado: text(),
    criadoEm: criadoEm(),
  },
  (t) => [index("avaliacoes_prontuario_idx").on(t.prontuarioId)],
);

export const encaminhamentos = pgTable(
  "encaminhamentos",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    origemUnidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    /** Unidade da rede que usa o sistema… */
    destinoUnidadeId: uuid().references(() => unidades.id),
    /** …ou serviço externo (Defensoria, Fórum etc.). */
    destinoExterno: text(),
    criadoPorId: uuid()
      .notNull()
      .references(() => usuarios.id),
    /** "Ficha de passagem": o que a próxima equipe precisa saber. */
    motivoCifrado: text().notNull(),
    urgencia: urgencia().notNull().default("ROTINA"),
    status: statusEncaminhamento().notNull().default("ENVIADO"),
    recebidoPorId: uuid().references(() => usuarios.id),
    recebidoEm: timestamp({ withTimezone: true }),
    concluidoEm: timestamp({ withTimezone: true }),
    respostaCifrado: text(),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("encaminhamentos_destino_idx").on(t.destinoUnidadeId, t.status),
    index("encaminhamentos_prontuario_idx").on(t.prontuarioId),
  ],
);

export const medidasProtetivas = pgTable(
  "medidas_protetivas",
  {
    id: uuid().primaryKey().defaultRandom(),
    prontuarioId: uuid()
      .notNull()
      .references(() => prontuarios.id),
    numeroProcesso: text(),
    /** Ex.: afastamento do lar, proibição de aproximação (300 m), de contato… */
    medidas: text().array().notNull().default([]),
    observacoesCifrado: text(),
    status: statusMedida().notNull().default("SOLICITADA"),
    solicitadaEm: date({ mode: "string" }),
    decididaEm: date({ mode: "string" }),
    validaAte: date({ mode: "string" }),
    unidadeId: uuid()
      .notNull()
      .references(() => unidades.id),
    registradoPorId: uuid()
      .notNull()
      .references(() => usuarios.id),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medidas_prontuario_idx").on(t.prontuarioId)],
);

// ---------------------------------------------------------------------------
// Trilha de auditoria (imutável)
// ---------------------------------------------------------------------------

export const auditoria = pgTable(
  "auditoria",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    usuarioId: uuid().references(() => usuarios.id),
    unidadeId: uuid().references(() => unidades.id),
    acao: text().notNull(),
    prontuarioId: uuid().references(() => prontuarios.id),
    alvo: text(),
    detalhes: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    userAgent: text(),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("auditoria_prontuario_idx").on(t.prontuarioId, t.criadoEm),
    index("auditoria_usuario_idx").on(t.usuarioId, t.criadoEm),
    index("auditoria_acao_idx").on(t.acao, t.criadoEm),
  ],
);

export type Unidade = typeof unidades.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Prontuario = typeof prontuarios.$inferSelect;
