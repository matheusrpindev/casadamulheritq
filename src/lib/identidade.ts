/**
 * Identidade visual por unidade.
 *
 * Cada unidade da rede escolhe uma identidade (Casa da Mulher, Secretaria ou Centro de
 * Referência de Direitos Humanos): quem trabalha nela vê os logos, as cores e a fonte
 * correspondentes. As cores vivem em variáveis CSS (globals.css,
 * bloco [data-identidade="…"]); aqui ficam os arquivos e os nomes.
 */
import type { Identidade } from "./dominio";

export type { Identidade };
export { IDENTIDADES } from "./dominio";

export const ROTULO_IDENTIDADE: Record<Identidade, string> = {
  CASA_DA_MULHER: "Casa da Mulher Itaquaquecetuba",
  SECRETARIA: "Secretaria da Mulher, Direitos Humanos e Cidadania",
  CENTRO_DIREITOS_HUMANOS: "Centro de Referência de Direitos Humanos",
};

/** Nome curto, para selos e listas. */
export const ROTULO_CURTO_IDENTIDADE: Record<Identidade, string> = {
  CASA_DA_MULHER: "Casa da Mulher",
  SECRETARIA: "Secretaria",
  CENTRO_DIREITOS_HUMANOS: "Centro de Referência de DH",
};

/** Identidade sugerida ao cadastrar uma unidade, a partir do tipo. */
export function identidadePadrao(tipoUnidade: string): Identidade {
  if (tipoUnidade === "CASA_DA_MULHER") return "CASA_DA_MULHER";
  if (tipoUnidade === "CENTRO_DIREITOS_HUMANOS") return "CENTRO_DIREITOS_HUMANOS";
  return "SECRETARIA";
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
    /** Largura do logo (classes Tailwind): no menu e em cabeçalhos claros (relatórios, impressão). */
    largura: { menu: string; horizontal: string };
    /** Opacidade das formas decorativas sobre o fundo colorido do painel. */
    opacidadeDecoracao: number;
  }
> = {
  CASA_DA_MULHER: {
    menu: { src: "/marca/casa-da-mulher-horizontal-branco.png", largura: 900, altura: 339 },
    horizontal: { src: "/marca/casa-da-mulher-horizontal.png", largura: 900, altura: 339 },
    destaque: { src: "/marca/casa-da-mulher-vertical.png", largura: 480, altura: 684 },
    icone: "/marca/icone-casa.svg",
    faixa: ["#862C72", "#E7A1A3", "#E07974", "#717075"],
    largura: { menu: "w-44", horizontal: "w-44" },
    opacidadeDecoracao: 0.85,
  },
  SECRETARIA: {
    menu: { src: "/marca/secretaria-branco.png", largura: 600, altura: 136 },
    horizontal: { src: "/marca/secretaria-completa.png", largura: 1200, altura: 128 },
    destaque: { src: "/marca/secretaria-completa.png", largura: 1200, altura: 128 },
    icone: "/marca/brasao.png",
    faixa: ["#095AFF", "#063798", "#01B5FF", "#FEED01", "#DE0067"],
    largura: { menu: "w-48", horizontal: "w-80" },
    opacidadeDecoracao: 1,
  },
  CENTRO_DIREITOS_HUMANOS: {
    menu: { src: "/marca/crd-horizontal-branco.png", largura: 1200, altura: 353 },
    horizontal: { src: "/marca/crd-horizontal.png", largura: 1200, altura: 353 },
    destaque: { src: "/marca/crd-horizontal.png", largura: 1200, altura: 353 },
    icone: "/marca/crd-simbolo.png",
    faixa: ["#0634CF", "#00B4FB", "#50B4A8", "#F7BE00", "#D6007E"],
    largura: { menu: "w-52", horizontal: "w-56" },
    opacidadeDecoracao: 1,
  },
};
