"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cx } from "@/components/ui";

/**
 * Aba do prontuário. Trocar de aba busca a seção no servidor; enquanto isso, a aba clicada já fica marcada e mostra
 * que está carregando, e o conteúdo atual continua na tela.
 */
export function LinkAba({ href, ativa, rotulo, contagem }: { href: string; ativa: boolean; rotulo: string; contagem?: number }) {
  return (
    <Link href={href} aria-current={ativa ? "page" : undefined} className="group -mb-px flex">
      <Conteudo ativa={ativa} rotulo={rotulo} contagem={contagem} />
    </Link>
  );
}

function Conteudo({ ativa, rotulo, contagem }: { ativa: boolean; rotulo: string; contagem?: number }) {
  const { pending } = useLinkStatus();
  const marcada = ativa || pending;
  return (
    <span
      className={cx(
        "flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap",
        marcada ? "border-marca-600 text-marca-800" : "border-transparent text-zinc-500 group-hover:text-zinc-800",
      )}
    >
      {rotulo}
      {pending ? (
        <Loader2 className="size-3.5 motion-safe:animate-spin" aria-label="carregando" />
      ) : (
        !!contagem && (
          <span className={cx("rounded-full px-1.5 text-xs tabular-nums", ativa ? "bg-marca-100" : "bg-zinc-100")}>{contagem}</span>
        )
      )}
    </span>
  );
}
