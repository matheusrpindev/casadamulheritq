/**
 * Identidade visual da Casa da Mulher em Itaquaquecetuba.
 * O símbolo (a casa formada por quatro triângulos) é desenhado em SVG a partir do
 * logo oficial; o logo completo, com o nome, fica em /public/marca.
 */
import { cx } from "./ui";

export const CORES_MARCA = {
  roxo: "#84296F",
  rosa: "#ED9CA3",
  coral: "#E37171",
  coralLaranja: "#F07F6A",
} as const;

export function Simbolo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      viewBox="0 0 500 455"
      className={className}
      role={titulo ? "img" : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      <g strokeWidth={1.5} strokeLinejoin="round">
        <path fill={CORES_MARCA.roxo} stroke={CORES_MARCA.roxo} d="M250 0 0 150 250 303Z" />
        <path fill={CORES_MARCA.rosa} stroke={CORES_MARCA.rosa} d="M250 0 500 150 250 303Z" />
        <path fill={CORES_MARCA.coral} stroke={CORES_MARCA.coral} d="M0 150 0 455 250 303Z" />
        <path fill={CORES_MARCA.coralLaranja} stroke={CORES_MARCA.coralLaranja} d="M500 150 500 455 250 303Z" />
      </g>
    </svg>
  );
}

/** Logo completo (símbolo + "Casa da Mulher em Itaquaquecetuba"). */
export function LogoCompleto({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG pequeno e estático; dispensa otimização
    <img
      src={claro ? "/marca/casa-da-mulher-branco.png" : "/marca/casa-da-mulher.png"}
      alt="Casa da Mulher em Itaquaquecetuba"
      width={400}
      height={642}
      className={cx("h-auto", className)}
    />
  );
}

/**
 * Triângulos decorativos nas cores do logo, para fundos de destaque.
 * Puramente visual (aria-hidden), posicionados no canto do contêiner pai (que precisa de `relative overflow-hidden`).
 */
export function TriangulosDecorativos({ className, opacidade = 0.9 }: { className?: string; opacidade?: number }) {
  return (
    <svg viewBox="0 0 500 455" aria-hidden className={cx("pointer-events-none absolute", className)} style={{ opacity: opacidade }}>
      <path fill={CORES_MARCA.rosa} d="M250 0 500 150 250 303Z" />
      <path fill={CORES_MARCA.coralLaranja} d="M500 150 500 455 250 303Z" />
      <path fill={CORES_MARCA.coral} d="M0 150 0 455 250 303Z" opacity={0.85} />
    </svg>
  );
}
