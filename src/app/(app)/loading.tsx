import { Loader2 } from "lucide-react";

/**
 * Aparece na hora do clique, enquanto a tela seguinte é montada no servidor: quem usa vê que o sistema respondeu.
 * O menu lateral continua na tela (ele fica no layout).
 */
export default function Carregando() {
  const bloco = "rounded-lg bg-zinc-200/70 motion-safe:animate-pulse";
  return (
    <div role="status" aria-live="polite">
      <p className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
        Carregando…
      </p>
      <div aria-hidden className="space-y-6">
        <div className="space-y-3">
          <div className={`${bloco} h-7 w-64 max-w-full`} />
          <div className={`${bloco} h-4 w-96 max-w-full`} />
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
          <div className="space-y-3">
            <div className={`${bloco} h-4 w-1/3`} />
            <div className={`${bloco} h-4 w-full`} />
            <div className={`${bloco} h-4 w-5/6`} />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
              <div className="space-y-3">
                <div className={`${bloco} h-4 w-1/2`} />
                <div className={`${bloco} h-4 w-full`} />
                <div className={`${bloco} h-4 w-2/3`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
