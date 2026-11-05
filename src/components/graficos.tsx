/**
 * Gráficos simples em HTML/CSS (sem biblioteca), renderizados no servidor.
 * Barras finas, ponta arredondada de 4px, base reta, rótulos seletivos,
 * dica ao passar o mouse (title + realce) e tabela acessível para leitores de tela.
 */
import { cx } from "./ui";

export type Barra = { rotulo: string; valor: number; oculto?: boolean; cor?: string };

const LIMIAR_SIGILO = 3;

/** Esconde contagens pequenas que poderiam identificar uma mulher (ex.: bairro com 1 caso). */
export function suprimirPequenos(barras: Barra[]): Barra[] {
  return barras.map((b) => (b.valor > 0 && b.valor < LIMIAR_SIGILO ? { ...b, oculto: true } : b));
}

export function BarrasHorizontais({ barras, unidade = "", vazio = "Sem dados no período." }: { barras: Barra[]; unidade?: string; vazio?: string }) {
  if (barras.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{vazio}</p>;
  const max = Math.max(...barras.map((b) => b.valor), 1);
  return (
    <div>
      <ul className="space-y-2.5" aria-hidden>
        {barras.map((b) => {
          const largura = b.oculto ? 3 : Math.max((b.valor / max) * 100, b.valor > 0 ? 1.5 : 0);
          const texto = b.oculto ? `< ${LIMIAR_SIGILO}` : b.valor.toLocaleString("pt-BR");
          return (
            <li key={b.rotulo} className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm" title={`${b.rotulo}: ${texto}${unidade}`}>
              <span className="truncate text-slate-600 group-hover:text-slate-900">{b.rotulo}</span>
              <div className="flex items-center gap-2">
                <div className="h-2.5 flex-1">
                  <div
                    className={cx("h-full rounded-r-[4px] transition-opacity group-hover:opacity-80", b.oculto && "opacity-40")}
                    style={{ width: `${largura}%`, backgroundColor: b.cor ?? "var(--color-marca-600)" }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-700 tabular-nums">{texto}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <TabelaAcessivel barras={barras} />
    </div>
  );
}

export function Colunas({ barras, unidade = "" }: { barras: Barra[]; unidade?: string }) {
  const max = Math.max(...barras.map((b) => b.valor), 1);
  const indiceMax = barras.findIndex((b) => b.valor === max);
  return (
    <div>
      <div className="relative" aria-hidden>
        <div className="flex h-44 items-end gap-[2px] border-b border-slate-200">
          {barras.map((b, i) => {
            const rotular = i === barras.length - 1 || i === indiceMax;
            return (
              <div key={b.rotulo} className="group relative flex h-full flex-1 flex-col justify-end" title={`${b.rotulo}: ${b.valor}${unidade}`}>
                <span
                  className={cx(
                    "mb-1 text-center text-[11px] font-medium text-slate-700 tabular-nums",
                    rotular ? "visible" : "invisible group-hover:visible",
                  )}
                >
                  {b.valor}
                </span>
                <div
                  className="mx-auto w-full max-w-6 rounded-t-[4px] bg-marca-600 transition-colors group-hover:bg-marca-800"
                  style={{ height: `${(b.valor / max) * 80}%`, minHeight: b.valor > 0 ? 2 : 0 }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {barras.map((b) => (
            <span key={b.rotulo} className="flex-1 truncate text-center text-[10px] text-slate-500">
              {b.rotulo}
            </span>
          ))}
        </div>
      </div>
      <TabelaAcessivel barras={barras} />
    </div>
  );
}

/** Barra empilhada única (proporções) com legenda rotulada e contagens. */
export function Proporcao({ partes }: { partes: (Barra & { cor: string })[] }) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-slate-500">Sem dados.</p>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-[4px]" aria-hidden>
        {partes
          .filter((p) => p.valor > 0)
          .map((p) => (
            <div key={p.rotulo} title={`${p.rotulo}: ${p.valor}`} style={{ width: `${(p.valor / total) * 100}%`, backgroundColor: p.cor }} />
          ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} aria-hidden />
            <span className="flex-1 text-slate-600">{p.rotulo}</span>
            <span className="font-medium text-slate-900 tabular-nums">{p.valor}</span>
            <span className="w-10 text-right text-xs text-slate-500 tabular-nums">{Math.round((p.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabelaAcessivel({ barras }: { barras: Barra[] }) {
  return (
    <table className="sr-only">
      <tbody>
        {barras.map((b) => (
          <tr key={b.rotulo}>
            <th scope="row">{b.rotulo}</th>
            <td>{b.oculto ? `menos de ${LIMIAR_SIGILO}` : b.valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
