"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Coloque dentro de um <Link> que leva para a mesma tela com outro filtro (aba, período, página): enquanto a tela
 * nova é buscada, aparece um indicador de carregando ao lado do texto.
 */
export function IndicadorLink() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="size-3.5 shrink-0 motion-safe:animate-spin" aria-label="carregando" /> : null;
}

/**
 * Botão de envio de um formulário de filtro (`next/form`). Depois do clique, mostra que está carregando até a
 * tela trocar de endereço — sem isso, a busca parece não ter respondido.
 */
export function BotaoFiltro({ className, icone, children }: { className?: string; icone?: ReactNode; children: ReactNode }) {
  const atual = useSearchParams().toString();
  const [esperandoSair, setEsperandoSair] = useState<string | null>(null);
  const pendente = esperandoSair !== null && esperandoSair === atual;
  return (
    <button
      type="submit"
      className={className}
      aria-busy={pendente || undefined}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        const destino = new URLSearchParams(Array.from(new FormData(form), ([k, v]) => [k, String(v)])).toString();
        if (destino !== atual) setEsperandoSair(atual);
      }}
    >
      {pendente ? <Loader2 className="size-4 motion-safe:animate-spin" aria-label="carregando" /> : icone}
      {children}
    </button>
  );
}
