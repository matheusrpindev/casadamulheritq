import "server-only";
import { headers } from "next/headers";

export async function dadosRequisicao() {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: encaminhado || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}
