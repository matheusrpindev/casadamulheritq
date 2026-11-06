/**
 * Marcas do sistema: Casa da Mulher Itaquaquecetuba, Secretaria da Mulher,
 * Direitos Humanos e Cidadania e Centro de Referência de Direitos Humanos. Qual
 * aparece depende da unidade de quem está logada (ver src/lib/identidade.ts). As cores vêm das variáveis CSS do bloco
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
 * (Casa da Mulher), os blocos sobrepostos da paleta (Secretaria) ou a roda de
 * pessoas do símbolo (Centro de Referência de Direitos Humanos).
 * O contêiner pai precisa de `relative overflow-hidden`.
 */
export function Decoracao({ identidade, className, opacidade = 0.9 }: { identidade: Identidade; className?: string; opacidade?: number }) {
  if (identidade === "CENTRO_DIREITOS_HUMANOS") {
    return (
      <svg viewBox="0 0 500 457" aria-hidden className={cx("pointer-events-none absolute", className)} style={{ opacity: opacidade }}>
        {RODA_CRD.map((p) => (
          <g key={p.cor}>
            <path d={p.arco} fill="none" stroke={p.cor} strokeWidth={46} />
            <circle cx={p.cabeca[0]} cy={p.cabeca[1]} r={34} fill={p.cor} />
          </g>
        ))}
      </svg>
    );
  }
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

/** Cinco pessoas de mãos dadas em roda, como no símbolo do CRD: um arco (braços) e uma cabeça para cada cor. */
const RODA_CRD = (() => {
  const [cx, cy, raio, raioCabeca] = [250, 235, 128, 196];
  const ponto = (r: number, graus: number) => {
    const a = (graus * Math.PI) / 180;
    return [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))] as const;
  };
  return [
    { angulo: -90, cor: "#0634CF" },
    { angulo: -18, cor: "#50B4A8" },
    { angulo: 54, cor: "#D6007E" },
    { angulo: 126, cor: "#F7BE00" },
    { angulo: 198, cor: "#00B4FB" },
  ].map(({ angulo, cor }) => {
    const [x1, y1] = ponto(raio, angulo - 31);
    const [x2, y2] = ponto(raio, angulo + 31);
    return { cor, arco: `M${x1} ${y1}A${raio} ${raio} 0 0 1 ${x2} ${y2}`, cabeca: ponto(raioCabeca, angulo) };
  });
})();
