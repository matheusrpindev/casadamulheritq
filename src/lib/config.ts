export const NOME_SISTEMA = "Acolhe";
/** Instituição dona da identidade visual (logo em /public/marca). */
export const INSTITUICAO = "Casa da Mulher Itaquaquecetuba";
export const NOME_REDE = process.env.NOME_REDE || "Itaquaquecetuba";
export const SUBTITULO_SISTEMA = "Prontuário único da rede de atendimento à mulher";
/** Base fictícia para a equipe testar o sistema: mostra uma faixa de aviso em todas as telas. */
export const MODO_VALIDACAO = process.env.MODO_VALIDACAO === "true";
export const PREFIXO_PRONTUARIO = process.env.PREFIXO_PRONTUARIO || "ITQ";

/** Bloqueio de tela no navegador após inatividade (o servidor derruba em 30 min). */
export const MINUTOS_BLOQUEIO_TELA = 15;
