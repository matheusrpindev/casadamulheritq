"use client";

import { AlertTriangle } from "lucide-react";
import { classeBotao } from "@/components/ui";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
      <AlertTriangle className="mx-auto size-10 text-rose-500" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Algo deu errado</h1>
      <p className="mt-1 text-sm text-slate-600">
        Nada do que já estava salvo foi perdido. Tente de novo; se o erro continuar, avise a administração do sistema.
      </p>
      <button type="button" onClick={reset} className={classeBotao("primario", "md", "mt-6")}>
        Tentar de novo
      </button>
    </div>
  );
}
