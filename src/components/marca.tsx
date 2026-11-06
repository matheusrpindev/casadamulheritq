/**
 * Marcas do sistema: Casa da Mulher Itaquaquecetuba e Secretaria da Mulher,
 * Direitos Humanos e Cidadania. Qual aparece depende da unidade de quem está
 * logada (ver src/lib/identidade.ts). As cores vêm das variáveis CSS do bloco
 * [data-identidade] em globals.css.
 */
import { MARCAS, ROTULO_IDENTIDADE, type Identidade } from "@/lib/identidade";
import { cx } from "./ui";

/** Logo da identidade. `uso`: menu (fundo escuro), horizontal (fundo claro) ou destaque (login). */
export function LogoMarca({
  identidade,
  uso,
  className,
}: {
  identidade: Identidade;
  uso: "menu" | "horizontal" | "destaque";
  className?: string;
}) {
  const img = MARCAS[identidade][uso];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG pequeno e estático; dispensa otimização
    <img src={img.src} alt={ROTULO_IDENTIDADE[identidade]} width={img.largura} height={img.altura} className={cx("h-auto", className)} />
  );
}

/** Faixa fina com as cores da identidade (topo do menu). */
export function FaixaCores({ identidade, className }: { identidade: Identidade; className?: string }) {
  return (
    <div aria-hidden className={cx("flex h-1 shrink-0", className)}>
      {MARCAS[identidade].faixa.map((cor) => (
        <span key={cor} className="flex-1" style={{ backgroundColor: cor }} />
      ))}
    </div>
  );
}

/**
 * Formas decorativas no canto de áreas de destaque: os triângulos da casa
 * (Casa da Mulher) ou os blocos sobrepostos da paleta (Secretaria).
 * O contêiner pai precisa de `relative overflow-hidden`.
 */
export function Decoracao({ identidade, className, opacidade = 0.9 }: { identidade: Identidade; className?: string; opacidade?: number }) {
  if (identidade === "SECRETARIA") {
    return (
      <svg viewBox="0 0 500 457" aria-hidden className={cx("pointer-events-none absolute", className)} style={{ opacity: opacidade }}>
        <rect x="170" y="40" width="330" height="190" fill="#01B5FF" />
        <rect x="60" y="150" width="380" height="110" fill="#FEED01" />
        <rect x="60" y="260" width="380" height="110" fill="#DE0067" />
        <rect x="300" y="300" width="200" height="157" fill="#095AFF" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 500 457" aria-hidden className={cx("pointer-events-none absolute", className)} style={{ opacity: opacidade }}>
      <path fill="#E7A1A3" d="M250 0 500 152 250 305Z" />
      <path fill="#E07974" d="M500 152 500 457 250 305Z" />
      <path fill="#E07974" d="M0 152 0 457 250 305Z" opacity={0.8} />
    </svg>
  );
}
