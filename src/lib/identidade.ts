/**
 * Identidade visual por unidade.
 *
 * Cada unidade da rede escolhe uma identidade: quem trabalha nela vê os logos, as
 * cores e a fonte correspondentes. As cores vivem em variáveis CSS (globals.css,
 * bloco [data-identidade="…"]); aqui ficam os arquivos e os nomes.
 */
import type { Identidade } from "./dominio";

export type { Identidade };
export { IDENTIDADES } from "./dominio";

export const ROTULO_IDENTIDADE: Record<Identidade, string> = {
  CASA_DA_MULHER: "Casa da Mulher Itaquaquecetuba",
  SECRETARIA: "Secretaria da Mulher, Direitos Humanos e Cidadania",
};

/** Identidade sugerida ao cadastrar uma unidade, a partir do tipo. */
export function identidadePadrao(tipoUnidade: string): Identidade {
  return tipoUnidade === "CASA_DA_MULHER" ? "CASA_DA_MULHER" : "SECRETARIA";
}

/** A tela de login é a porta da rede inteira: usa sempre a identidade da Secretaria, para todas as unidades. */
export const IDENTIDADE_LOGIN: Identidade = "SECRETARIA";

type Imagem = { src: string; largura: number; altura: number };

export const MARCAS: Record<
  Identidade,
  {
    /** Logo em fundo escuro, compacto (menu lateral, barra do celular). */
    menu: Imagem;
    /** Logo em fundo claro, horizontal (impressões, login no celular). */
    horizontal: Imagem;
    /** Logo em destaque na tela de login. */
    destaque: Imagem;
    /** Ícone da aba do navegador. */
    icone: string;
    /** Faixa de cores no topo do menu. */
    faixa: string[];
  }
> = {
  CASA_DA_MULHER: {
    menu: { src: "/marca/casa-da-mulher-horizontal-branco.png", largura: 900, altura: 339 },
    horizontal: { src: "/marca/casa-da-mulher-horizontal.png", largura: 900, altura: 339 },
    destaque: { src: "/marca/casa-da-mulher-vertical.png", largura: 480, altura: 684 },
    icone: "/marca/icone-casa.svg",
    faixa: ["#862C72", "#E7A1A3", "#E07974", "#717075"],
  },
  SECRETARIA: {
    menu: { src: "/marca/secretaria-branco.png", largura: 600, altura: 136 },
    horizontal: { src: "/marca/secretaria-completa.png", largura: 1200, altura: 128 },
    destaque: { src: "/marca/secretaria-completa.png", largura: 1200, altura: 128 },
    icone: "/marca/brasao.png",
    faixa: ["#095AFF", "#063798", "#01B5FF", "#FEED01", "#DE0067"],
  },
};
