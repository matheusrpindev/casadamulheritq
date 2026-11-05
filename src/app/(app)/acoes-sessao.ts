"use server";

import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/auditoria";
import { encerrarSessao, obterUsuario } from "@/lib/sessao";

export async function sair(motivo: "saiu" | "inatividade" = "saiu") {
  const usuario = await obterUsuario();
  if (usuario) {
    await registrarAuditoria(
      "LOGOUT",
      { usuarioId: usuario.id, unidadeId: usuario.unidadeId },
      { detalhes: { motivo } },
    );
  }
  await encerrarSessao();
  redirect(`/login?motivo=${motivo === "inatividade" ? "inatividade" : "saiu"}`);
}

/** Chamado pelo navegador enquanto a pessoa está digitando/usando a tela. */
export async function manterSessao(): Promise<boolean> {
  return (await obterUsuario()) !== null;
}
