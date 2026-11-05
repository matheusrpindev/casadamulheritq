import { FlaskConical } from "lucide-react";
import { MODO_VALIDACAO } from "@/lib/config";

/** Aviso fixo quando o sistema roda com a base fictícia de validação. */
export function FaixaValidacao() {
  if (!MODO_VALIDACAO) return null;
  return (
    <div role="note" className="flex items-center justify-center gap-2 bg-amber-300 px-4 py-1.5 text-center text-xs font-semibold text-amber-950 print:border print:border-amber-500">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      Ambiente de validação — todas as mulheres e histórias aqui são fictícias. Não registre dados reais.
    </div>
  );
}
