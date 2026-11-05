import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "suave";
type Tamanho = "sm" | "md";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-lilas-700 text-white hover:bg-lilas-800 shadow-sm",
  secundario: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs",
  fantasma: "text-slate-700 hover:bg-slate-100",
  perigo: "bg-rose-700 text-white hover:bg-rose-800 shadow-sm",
  suave: "bg-lilas-50 text-lilas-800 hover:bg-lilas-100",
};
const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function classeBotao(variante: Variante = "primario", tamanho: Tamanho = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  );
}

export function Botao({
  variante,
  tamanho,
  className,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho }) {
  return <button className={classeBotao(variante, tamanho, className)} {...props} />;
}

export function BotaoLink({
  variante,
  tamanho,
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho }) {
  return <Link className={classeBotao(variante, tamanho, className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------

export function Cartao({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-xs", className)} {...props} />;
}

export function CabecalhoCartao({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icone && <div className="mt-0.5 text-lilas-600">{icone}</div>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
        </div>
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

export function TituloPagina({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <header className="mb-6">
      {voltar && (
        <Link href={voltar.href} className="mb-2 inline-flex text-sm text-lilas-700 hover:underline">
          ← {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
          {descricao && <p className="mt-1 max-w-3xl text-sm text-slate-600">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Selos e avisos
// ---------------------------------------------------------------------------

type Tom = "neutro" | "lilas" | "verde" | "ambar" | "vermelho" | "azul";
const TONS: Record<Tom, string> = {
  neutro: "bg-slate-100 text-slate-700 ring-slate-200",
  lilas: "bg-lilas-50 text-lilas-800 ring-lilas-200",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-900 ring-amber-200",
  vermelho: "bg-rose-50 text-rose-800 ring-rose-200",
  azul: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function Selo({ tom = "neutro", children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeloUnidade({ unidade }: { unidade: { sigla: string; nome: string; cor: string } }) {
  return (
    <span
      title={unidade.nome}
      className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 ring-inset"
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: unidade.cor }} aria-hidden />
      {unidade.sigla}
    </span>
  );
}

const TONS_AVISO: Record<"info" | "atencao" | "perigo" | "sucesso", string> = {
  info: "border-lilas-200 bg-lilas-50 text-lilas-900",
  atencao: "border-amber-200 bg-amber-50 text-amber-900",
  perigo: "border-rose-200 bg-rose-50 text-rose-900",
  sucesso: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Aviso({
  tom = "info",
  titulo,
  children,
  icone,
  className,
}: {
  tom?: keyof typeof TONS_AVISO;
  titulo?: ReactNode;
  children?: ReactNode;
  icone?: ReactNode;
  className?: string;
}) {
  return (
    <div role={tom === "perigo" ? "alert" : undefined} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", TONS_AVISO[tom], className)}>
      {icone && <div className="mt-0.5 shrink-0">{icone}</div>}
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={cx(!!titulo && "mt-0.5", "leading-relaxed")}>{children}</div>}
      </div>
    </div>
  );
}

export function Vazio({ titulo, children, icone }: { titulo: string; children?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icone && <div className="mb-3 text-slate-300">{icone}</div>}
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------

export function Campo({
  rotulo,
  dica,
  erro,
  obrigatorio,
  children,
  className,
  htmlFor,
}: {
  rotulo: ReactNode;
  dica?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {rotulo}
        {obrigatorio && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
      {dica && !erro && <p className="mt-1 text-xs text-slate-500">{dica}</p>}
      {erro && <p className="mt-1 text-xs font-medium text-rose-700">{erro}</p>}
    </div>
  );
}

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("campo-base", className)} {...props} />;
}

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx("campo-base leading-relaxed", className)} {...props} />;
}

export function Seletor({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cx("campo-base pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Marcador({
  rotulo,
  descricao,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { rotulo: ReactNode; descricao?: ReactNode; type?: "checkbox" | "radio" }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
        "hover:border-lilas-300 has-checked:border-lilas-400 has-checked:bg-lilas-50/60",
        className,
      )}
    >
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-lilas-700" {...props} />
      <span>
        <span className="text-slate-800">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-slate-500">{descricao}</span>}
      </span>
    </label>
  );
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function DadoRotulado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}
