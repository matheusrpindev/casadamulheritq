"use client";

import { createContext, startTransition, use, useActionState, useEffect, useRef, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Aviso, classeBotao, cx } from "./ui";
import type { EstadoAcao } from "@/lib/estado-acao";

const PendenteContexto = createContext(false);
const ErrosContexto = createContext<Record<string, string> | undefined>(undefined);
const EstadoContexto = createContext<EstadoAcao>({});

/** Último estado devolvido pela ação (ex.: dados extras como duplicidades). */
export function useEstadoAcao(): EstadoAcao {
  return use(EstadoContexto);
}

/**
 * Formulário ligado a uma server action.
 *
 * Diferente do <form action> padrão do React 19, NÃO limpa os campos quando a
 * ação devolve erro — ninguém pode perder um relato longo por causa de um campo
 * esquecido. Os campos só são limpos depois de um envio bem-sucedido.
 */
export function FormAcao({
  acao,
  children,
  className,
  limparAoSalvar = true,
  confirmar,
  id,
}: {
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  children: ReactNode;
  className?: string;
  limparAoSalvar?: boolean;
  /** Texto de confirmação antes de enviar (ações sensíveis). */
  confirmar?: string;
  id?: string;
}) {
  const [estado, despachar, pendente] = useActionState(acao, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form
      id={id}
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        // Inclui o botão clicado (name/value) — permite botões com ações diferentes.
        const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const dados = new FormData(e.currentTarget, botao);
        startTransition(() => despachar(dados));
      }}
    >
      <EstadoContexto value={estado}>
      <PendenteContexto value={pendente}>
        <ErrosContexto value={estado.erros}>
          {estado.erro && (
            <Aviso tom="perigo" className="mb-4">
              {estado.erro}
            </Aviso>
          )}
          {estado.ok && estado.mensagem && (
            <Aviso tom="sucesso" className="mb-4" icone={<CheckCircle2 className="size-4" />}>
              {estado.mensagem}
            </Aviso>
          )}
          {children}
        </ErrosContexto>
      </PendenteContexto>
      </EstadoContexto>
    </form>
  );
}

export function useErroCampo(nome: string): string | undefined {
  return use(ErrosContexto)?.[nome];
}

export function ErroCampo({ nome }: { nome: string }) {
  const erro = useErroCampo(nome);
  return erro ? <p className="mt-1 text-xs font-medium text-rose-700">{erro}</p> : null;
}

export function BotaoEnviar({
  children,
  variante = "primario",
  tamanho = "md",
  className,
  name,
  value,
}: {
  children: ReactNode;
  variante?: "primario" | "secundario" | "perigo" | "suave";
  tamanho?: "sm" | "md";
  className?: string;
  name?: string;
  value?: string;
}) {
  const pendente = use(PendenteContexto);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pendente}
      className={cx(classeBotao(variante, tamanho), className)}
    >
      {pendente && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
