import type {
  ESPECIALIDADES,
  NIVEIS_RISCO,
  PAPEIS,
  SIGILOS,
  STATUS_ENCAMINHAMENTO,
  STATUS_MEDIDA,
  TIPOS_ATENDIMENTO,
  TIPOS_UNIDADE,
  TIPOS_VIOLENCIA,
  URGENCIAS,
  VINCULOS_AUTOR,
} from "@/lib/dominio";

type Rotulos<T extends readonly string[]> = Record<T[number], string>;

export const ROTULO_PAPEL: Rotulos<typeof PAPEIS> = {
  ADMIN: "Administração do sistema (TI)",
  GESTORA: "Gestão / coordenação",
  TECNICA: "Equipe técnica",
  RECEPCAO: "Recepção",
};

export const ROTULO_ESPECIALIDADE: Rotulos<typeof ESPECIALIDADES> = {
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço Social",
  JURIDICO: "Jurídico",
  SAUDE: "Saúde",
  ACOLHIMENTO: "Acolhimento",
  ADMINISTRATIVO: "Administrativo",
  OUTRA: "Outra",
};

export const ROTULO_TIPO_UNIDADE: Rotulos<typeof TIPOS_UNIDADE> = {
  CASA_DA_MULHER: "Casa da Mulher",
  SECRETARIA: "Secretaria",
  CREAS: "CREAS",
  CRAS: "CRAS",
  DELEGACIA: "Delegacia",
  SAUDE: "Saúde",
  JURIDICO: "Jurídico / Defensoria",
  ABRIGO: "Casa-abrigo",
  OUTRO: "Outro",
};

export const ROTULO_RISCO: Rotulos<typeof NIVEIS_RISCO> = {
  NAO_AVALIADO: "Risco não avaliado",
  BAIXO: "Risco baixo",
  MEDIO: "Risco médio",
  ELEVADO: "Risco elevado",
};

export const ROTULO_SIGILO: Rotulos<typeof SIGILOS> = {
  REDE: "Visível para a rede",
  UNIDADE: "Só minha unidade",
  ESPECIALIDADE: "Só minha especialidade",
};

export const DESCRICAO_SIGILO: Rotulos<typeof SIGILOS> = {
  REDE: "Equipes técnicas de todas as unidades com acesso ao prontuário.",
  UNIDADE: "Só a equipe técnica da sua unidade.",
  ESPECIALIDADE: "Só profissionais da sua especialidade (ex.: Psicologia), em qualquer unidade.",
};

export const ROTULO_TIPO_ATENDIMENTO: Rotulos<typeof TIPOS_ATENDIMENTO> = {
  ACOLHIMENTO: "Acolhimento",
  PSICOLOGICO: "Atendimento psicológico",
  SOCIAL: "Atendimento social",
  JURIDICO: "Orientação jurídica",
  SAUDE: "Atendimento de saúde",
  RETORNO: "Retorno",
  CONTATO_TELEFONICO: "Contato telefônico",
  VISITA: "Visita",
  GRUPO: "Grupo / oficina",
  OUTRO: "Outro",
};

export const ROTULO_VIOLENCIA: Rotulos<typeof TIPOS_VIOLENCIA> = {
  FISICA: "Física",
  PSICOLOGICA: "Psicológica",
  SEXUAL: "Sexual",
  PATRIMONIAL: "Patrimonial",
  MORAL: "Moral",
  OUTRA: "Outra",
};

export const DESCRICAO_VIOLENCIA: Rotulos<typeof TIPOS_VIOLENCIA> = {
  FISICA: "Ofensa à integridade ou saúde corporal",
  PSICOLOGICA: "Ameaça, humilhação, controle, isolamento, perseguição",
  SEXUAL: "Relação ou ato sexual forçado, impedir uso de contraceptivo",
  PATRIMONIAL: "Reter, destruir ou subtrair bens, documentos, dinheiro",
  MORAL: "Calúnia, difamação ou injúria",
  OUTRA: "Outras formas",
};

export const ROTULO_URGENCIA: Rotulos<typeof URGENCIAS> = {
  ROTINA: "Rotina",
  PRIORITARIA: "Prioritária",
  URGENTE: "Urgente",
};

export const ROTULO_STATUS_ENCAMINHAMENTO: Rotulos<typeof STATUS_ENCAMINHAMENTO> = {
  ENVIADO: "Aguardando",
  RECEBIDO: "Em atendimento",
  CONCLUIDO: "Concluído",
  RECUSADO: "Recusado",
  CANCELADO: "Cancelado",
};

export const ROTULO_STATUS_MEDIDA: Rotulos<typeof STATUS_MEDIDA> = {
  SOLICITADA: "Solicitada",
  DEFERIDA: "Deferida (vigente)",
  INDEFERIDA: "Indeferida",
  REVOGADA: "Revogada",
  ENCERRADA: "Encerrada",
};

export const ROTULO_VINCULO: Rotulos<typeof VINCULOS_AUTOR> = {
  CONJUGE_COMPANHEIRO: "Cônjuge / companheiro(a)",
  EX_CONJUGE_COMPANHEIRO: "Ex-cônjuge / ex-companheiro(a)",
  NAMORADO: "Namorado(a)",
  EX_NAMORADO: "Ex-namorado(a)",
  PAI_PADRASTO: "Pai / padrasto",
  MAE_MADRASTA: "Mãe / madrasta",
  FILHO: "Filho(a)",
  IRMAO: "Irmão / irmã",
  OUTRO_FAMILIAR: "Outro familiar",
  CONHECIDO: "Conhecido(a)",
  DESCONHECIDO: "Desconhecido(a)",
  OUTRO: "Outro",
};

export const ROTULO_ORIGEM_ACESSO = {
  ORIGEM: "Unidade que abriu o prontuário",
  ENCAMINHAMENTO: "Recebeu encaminhamento",
  AUTORIZACAO: "Autorizado pela mulher",
  EMERGENCIAL: "Acesso emergencial",
} as const;

/** Medidas protetivas de urgência mais comuns (Lei 11.340/2006, arts. 22 a 24). */
export const MEDIDAS_PROTETIVAS_COMUNS = [
  "Afastamento do agressor do lar",
  "Proibição de aproximação",
  "Proibição de contato por qualquer meio",
  "Proibição de frequentar determinados lugares",
  "Suspensão da posse ou restrição do porte de armas",
  "Restrição ou suspensão de visitas aos filhos",
  "Prestação de alimentos provisórios",
  "Comparecimento a programa de reeducação",
  "Acompanhamento psicossocial do agressor",
] as const;

export const IDENTIDADES_GENERO = [
  "Mulher cisgênero",
  "Mulher transgênero",
  "Travesti",
  "Pessoa não binária",
  "Outra",
  "Prefere não informar",
] as const;

export const ESTADOS_CIVIS = [
  "Solteira",
  "Casada / união estável",
  "Separada / divorciada",
  "Viúva",
] as const;

export const SITUACOES_TRABALHO = [
  "Trabalho com carteira assinada",
  "Trabalho informal / autônoma",
  "Desempregada",
  "Do lar",
  "Aposentada / pensionista",
  "Estudante",
] as const;

/** Faixas de renda familiar mensal, em salários mínimos. */
export const FAIXAS_RENDA = [
  "Sem renda",
  "Até 1 salário mínimo",
  "De 1 a 2 salários mínimos",
  "De 2 a 3 salários mínimos",
  "Mais de 3 salários mínimos",
] as const;

export const SITUACOES_MORADIA = [
  "Própria",
  "Alugada",
  "Cedida / de favor",
  "Mora com o autor da violência",
  "Acolhimento / casa-abrigo",
  "Situação de rua",
] as const;

export const RACAS_COR = ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Prefere não declarar"] as const;

export const ESCOLARIDADES = [
  "Sem escolaridade",
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
  "Pós-graduação",
] as const;

export const ROTULO_ACAO: Record<string, string> = {
  LOGIN: "Entrou no sistema",
  LOGIN_FALHA: "Tentativa de login falhou",
  LOGIN_BLOQUEADO: "Conta bloqueada por tentativas",
  LOGOUT: "Saiu do sistema",
  BUSCA: "Fez uma busca",
  PRONTUARIO_CRIADO: "Abriu prontuário",
  PRONTUARIO_VISUALIZADO: "Visualizou prontuário",
  PRONTUARIO_IMPRESSO: "Gerou versão para impressão",
  CADASTRO_ALTERADO: "Alterou dados cadastrais",
  CONSENTIMENTO_ALTERADO: "Alterou autorização de compartilhamento",
  RELATO_REGISTRADO: "Registrou relato",
  ATENDIMENTO_REGISTRADO: "Registrou atendimento",
  RETIFICACAO: "Registrou retificação",
  AVALIACAO_RISCO: "Aplicou avaliação de risco (FONAR)",
  AUTOR_REGISTRADO: "Registrou autor da violência",
  MEDIDA_REGISTRADA: "Registrou medida protetiva",
  MEDIDA_ATUALIZADA: "Atualizou medida protetiva",
  ENCAMINHAMENTO_CRIADO: "Encaminhou",
  ENCAMINHAMENTO_RECEBIDO: "Confirmou recebimento de encaminhamento",
  ENCAMINHAMENTO_CONCLUIDO: "Concluiu encaminhamento",
  ENCAMINHAMENTO_RECUSADO: "Recusou encaminhamento",
  ENCAMINHAMENTO_CANCELADO: "Cancelou encaminhamento",
  ACESSO_EMERGENCIAL: "Acesso emergencial (quebra de vidro)",
  ACESSO_EMERGENCIAL_REVISADO: "Revisou acesso emergencial",
  ACESSO_REVOGADO: "Revogou acesso de unidade",
  PRONTUARIO_ARQUIVADO: "Arquivou prontuário",
  PRONTUARIO_REATIVADO: "Reativou prontuário",
  USUARIO_CRIADO: "Criou conta de usuária",
  USUARIO_ALTERADO: "Alterou conta de usuária",
  SENHA_REDEFINIDA: "Redefiniu senha de outra pessoa",
  SENHA_ALTERADA: "Trocou a própria senha",
  UNIDADE_CRIADA: "Cadastrou unidade",
  UNIDADE_ALTERADA: "Alterou unidade",
  RELATORIO_EXPORTADO: "Exportou relatório agregado (CSV)",
};
