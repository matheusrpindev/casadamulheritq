/**
 * Identidade visual oficial da Casa da Mulher Itaquaquecetuba.
 * O símbolo (a casa formada por triângulos) é desenhado em SVG a partir do logo
 * oficial; as versões completas (com o nome) ficam em /public/marca:
 *   casa-da-mulher-{horizontal|vertical}.png         texto cinza, para fundo claro
 *   casa-da-mulher-{horizontal|vertical}-branco.png  texto branco, para fundo escuro
 */
import { cx } from "./ui";

export const CORES_MARCA = {
  roxo: "#862C72",
  rosa: "#E7A1A3",
  coral: "#E07974",
  cinza: "#717075",
} as const;

export function Simbolo({ className, titulo }: { className?: string; titulo?: string }) {
  return (
    <svg
      viewBox="0 0 500 457"
      className={className}
      role={titulo ? "img" : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      <g strokeWidth={1.5} strokeLinejoin="round">
        <path fill={CORES_MARCA.roxo} stroke={CORES_MARCA.roxo} d="M250 0 0 152 250 305Z" />
        <path fill={CORES_MARCA.rosa} stroke={CORES_MARCA.rosa} d="M250 0 500 152 250 305Z" />
        <path fill={CORES_MARCA.coral} stroke={CORES_MARCA.coral} d="M0 152 0 457 250 305Z M500 152 500 457 250 305Z" />
      </g>
    </svg>
  );
}

const DIMENSOES = { horizontal: [900, 339], vertical: [480, 684] } as const;

/** Logo completo (símbolo + "Casa da Mulher Itaquaquecetuba"). */
export function LogoCompleto({
  className,
  orientacao = "vertical",
  claro = false,
}: {
  className?: string;
  orientacao?: "vertical" | "horizontal";
  /** Texto branco, para fundos escuros. */
  claro?: boolean;
}) {
  const [w, h] = DIMENSOES[orientacao];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG pequeno e estático; dispensa otimização
    <img
      src={`/marca/casa-da-mulher-${orientacao}${claro ? "-branco" : ""}.png`}
      alt="Casa da Mulher Itaquaquecetuba"
      width={w}
      height={h}
      className={cx("h-auto", className)}
    />
  );
}

/**
 * Triângulos decorativos nas cores da marca, para fundos de destaque.
 * Puramente visual; o contêiner pai precisa de `relative overflow-hidden`.
 */
export function TriangulosDecorativos({ className, opacidade = 0.9 }: { className?: string; opacidade?: number }) {
  return (
    <svg viewBox="0 0 500 457" aria-hidden className={cx("pointer-events-none absolute", className)} style={{ opacity: opacidade }}>
      <path fill={CORES_MARCA.rosa} d="M250 0 500 152 250 305Z" />
      <path fill={CORES_MARCA.coral} d="M500 152 500 457 250 305Z" />
      <path fill={CORES_MARCA.coral} d="M0 152 0 457 250 305Z" opacity={0.8} />
    </svg>
  );
}
