"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { manterSessao, sair } from "@/app/(app)/acoes-sessao";
import { classeBotao } from "./ui";

const INTERVALO_PING_MS = 2 * 60 * 1000;
const AVISO_ANTES_MS = 2 * 60 * 1000;

/**
 * Protege a tela em computadores compartilhados:
 * - enquanto há atividade (digitação, cliques), renova a sessão no servidor —
 *   assim um relato longo nunca se perde por "sessão expirada";
 * - sem atividade, avisa e depois sai sozinha.
 */
export function GuardaInatividade({ minutos }: { minutos: number }) {
  const limiteMs = minutos * 60 * 1000;
  const ultimaAtividade = useRef(0);
  const ultimoPing = useRef(0);
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    ultimaAtividade.current = Date.now();
    ultimoPing.current = Date.now();
    const marcar = () => {
      ultimaAtividade.current = Date.now();
    };
    const eventos = ["keydown", "pointerdown", "pointermove", "wheel", "touchstart", "input"] as const;
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));

    const relogio = window.setInterval(async () => {
      const agora = Date.now();
      const parado = agora - ultimaAtividade.current;

      if (parado >= limiteMs) {
        window.clearInterval(relogio);
        await sair("inatividade");
        return;
      }
      setRestante(parado >= limiteMs - AVISO_ANTES_MS ? Math.ceil((limiteMs - parado) / 1000) : null);

      if (parado < INTERVALO_PING_MS && agora - ultimoPing.current >= INTERVALO_PING_MS) {
        ultimoPing.current = agora;
        const ativa = await manterSessao().catch(() => true);
        if (!ativa) window.location.assign("/login?motivo=inatividade");
      }
    }, 1000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcar));
      window.clearInterval(relogio);
    };
  }, [limiteMs]);

  if (restante === null) return null;
  const mm = Math.floor(restante / 60);
  const ss = String(restante % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="titulo-inatividade">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <ShieldAlert className="mx-auto size-10 text-lilas-600" />
        <h2 id="titulo-inatividade" className="mt-3 text-lg font-semibold text-slate-900">
          Ainda está aí?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Por segurança, o sistema vai sair em <strong className="tabular-nums">{mm}:{ss}</strong>.
        </p>
        <button
          type="button"
          className={classeBotao("primario", "md", "mt-5 w-full")}
          onClick={() => {
            ultimaAtividade.current = Date.now();
            setRestante(null);
          }}
        >
          Continuar trabalhando
        </button>
      </div>
    </div>
  );
}
