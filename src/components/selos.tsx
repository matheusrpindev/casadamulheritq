import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { NivelRisco } from "@/db/schema";
import { ROTULO_RISCO, ROTULO_STATUS_ENCAMINHAMENTO, ROTULO_URGENCIA } from "@/lib/rotulos";
import { Selo, cx } from "./ui";

export function SeloRisco({ nivel, grande }: { nivel: NivelRisco; grande?: boolean }) {
  const tom = { NAO_AVALIADO: "neutro", BAIXO: "verde", MEDIO: "ambar", ELEVADO: "vermelho" } as const;
  const Icone = { NAO_AVALIADO: ShieldQuestion, BAIXO: ShieldCheck, MEDIO: AlertTriangle, ELEVADO: ShieldAlert }[nivel];
  return (
    <Selo tom={tom[nivel]} className={cx(grande && "px-3 py-1 text-sm", nivel === "ELEVADO" && "font-semibold")}>
      <Icone className={grande ? "size-4" : "size-3.5"} aria-hidden />
      {ROTULO_RISCO[nivel]}
    </Selo>
  );
}

export function SeloUrgencia({ urgencia }: { urgencia: "ROTINA" | "PRIORITARIA" | "URGENTE" }) {
  const tom = { ROTINA: "neutro", PRIORITARIA: "ambar", URGENTE: "vermelho" } as const;
  return <Selo tom={tom[urgencia]}>{ROTULO_URGENCIA[urgencia]}</Selo>;
}

export function SeloStatusEncaminhamento({
  status,
}: {
  status: "ENVIADO" | "RECEBIDO" | "CONCLUIDO" | "RECUSADO" | "CANCELADO";
}) {
  const tom = { ENVIADO: "ambar", RECEBIDO: "azul", CONCLUIDO: "verde", RECUSADO: "vermelho", CANCELADO: "neutro" } as const;
  return <Selo tom={tom[status]}>{ROTULO_STATUS_ENCAMINHAMENTO[status]}</Selo>;
}

export function Avatar({ nome, className }: { nome: string; className?: string }) {
  const partes = nome.trim().split(/\s+/);
  const ini = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  return (
    <span
      aria-hidden
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-full bg-marca-100 text-xs font-semibold text-marca-800",
        className,
      )}
    >
      {ini}
    </span>
  );
}
