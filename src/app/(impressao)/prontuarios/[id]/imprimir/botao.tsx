"use client";

import { Printer } from "lucide-react";
import { classeBotao } from "@/components/ui";

export function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={classeBotao("primario", "sm")}>
      <Printer className="size-4" /> Imprimir
    </button>
  );
}
