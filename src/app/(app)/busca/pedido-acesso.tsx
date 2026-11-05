"use client";

import { useState } from "react";
import { KeyRound, Siren } from "lucide-react";
import { BotaoEnviar, ErroCampo, FormAcao } from "@/components/form-acao";
import { AreaTexto, Marcador, classeBotao, cx } from "@/components/ui";
import { solicitarAcesso } from "../prontuarios/acoes";

export function PedidoAcesso({ prontuarioId, autorizado }: { prontuarioId: string; autorizado: boolean }) {
  const [tipo, setTipo] = useState<"AUTORIZACAO" | "EMERGENCIAL" | null>(null);

  if (!tipo) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" className={classeBotao("suave", "sm")} onClick={() => setTipo("AUTORIZACAO")}>
          <KeyRound className="size-3.5" /> {autorizado ? "Abrir com autorização dela" : "Ela está aqui e autorizou"}
        </button>
        <button type="button" className={classeBotao("secundario", "sm", "text-rose-800")} onClick={() => setTipo("EMERGENCIAL")}>
          <Siren className="size-3.5" /> Acesso emergencial
        </button>
      </div>
    );
  }

  const emergencial = tipo === "EMERGENCIAL";
  return (
    <FormAcao
      acao={solicitarAcesso.bind(null, prontuarioId)}
      limparAoSalvar={false}
      className={cx(
        "max-w-2xl space-y-3 rounded-xl border p-4",
        emergencial ? "border-rose-200 bg-rose-50/60" : "border-marca-200 bg-marca-50/60",
      )}
    >
      <input type="hidden" name="tipo" value={tipo} />
      <p className="text-sm font-semibold text-zinc-900">
        {emergencial ? "Acesso emergencial (quebra de vidro)" : "Acesso autorizado pela mulher"}
      </p>
      <p className="text-xs leading-relaxed text-zinc-600">
        {emergencial
          ? "Use só quando houver risco à vida ou à integridade dela e não for possível pedir autorização. O acesso dura 24 horas, fica registrado em seu nome e a gestão da unidade de origem será avisada para revisar."
          : "Registre como ela autorizou (presencialmente, por telefone…). Sua unidade passa a acompanhar o caso, e o acesso fica registrado na trilha de auditoria."}
      </p>
      <div>
        <label htmlFor={`just-${prontuarioId}`} className="mb-1 block text-xs font-medium text-zinc-700">
          Justificativa
        </label>
        <AreaTexto
          id={`just-${prontuarioId}`}
          name="justificativa"
          rows={3}
          required
          minLength={15}
          placeholder={
            emergencial
              ? "Ex.: chegou ao plantão com lesões e relata ameaça de morte; precisamos do histórico e da avaliação de risco."
              : "Ex.: ela compareceu à unidade e autorizou verbalmente que consultássemos o atendimento feito na Secretaria."
          }
        />
        <ErroCampo nome="justificativa" />
      </div>
      <Marcador
        name="declaro"
        required
        rotulo={
          emergencial
            ? "Declaro que o acesso é necessário para proteger a vida ou a integridade dela."
            : "Declaro que ela autorizou este acesso."
        }
      />
      <div className="flex gap-2">
        <BotaoEnviar variante={emergencial ? "perigo" : "primario"} tamanho="sm">
          Abrir prontuário
        </BotaoEnviar>
        <button type="button" className={classeBotao("fantasma", "sm")} onClick={() => setTipo(null)}>
          Cancelar
        </button>
      </div>
    </FormAcao>
  );
}
