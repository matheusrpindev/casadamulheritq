"use client";

import { Printer } from "lucide-react";
import { classeBotao } from "./ui";

export function BotaoImprimir({ rotulo = "Imprimir", variante = "primario" }: { rotulo?: string; variante?: "primario" | "secundario" }) {
  return (
    <button type="button" onClick={() => window.print()} className={classeBotao(variante, "sm")}>
      <Printer className="size-4" /> {rotulo}
    </button>
  );
}
