"use client";

import { useMemo, useState } from "react";
import { Home, ShieldAlert } from "lucide-react";
import { BotaoEnviar, ErroCampo, FormAcao } from "@/components/form-acao";
import { AreaTexto, Aviso, cx } from "@/components/ui";
import { SeloRisco } from "@/components/selos";
import { avaliarFonar, FONAR, limparRespostas, type Pergunta, type Respostas } from "@/lib/fonar";
import { ROTULO_RISCO } from "@/lib/rotulos";
import { registrarAvaliacaoRisco } from "../../../acoes";

export function FormularioFonar({ prontuarioId, anteriores }: { prontuarioId: string; anteriores: Respostas | null }) {
  const [respostas, setRespostas] = useState<Respostas>(anteriores ?? {});
  const resultado = useMemo(() => avaliarFonar(respostas), [respostas]);
  const [classificacao, setClassificacao] = useState<string>("");

  const alternar = (p: Pergunta, valor: string, marcado: boolean) => {
    setRespostas((atual) => {
      const lista = atual[p.id] ?? [];
      let nova: string[];
      if (p.tipo === "unica") nova = marcado ? [valor] : [];
      else {
        const opcao = p.opcoes.find((o) => o.valor === valor);
        if (!marcado) nova = lista.filter((v) => v !== valor);
        else if (opcao?.exclusiva) nova = [valor];
        else nova = [...lista.filter((v) => !p.opcoes.find((o) => o.valor === v)?.exclusiva), valor];
      }
      return limparRespostas({ ...atual, [p.id]: nova });
    });
  };

  const total = FONAR.reduce((n, b) => n + b.perguntas.length, 0);

  return (
    <FormAcao acao={registrarAvaliacaoRisco.bind(null, prontuarioId)} limparAoSalvar={false}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {anteriores && (
            <Aviso tom="info" titulo="Respostas da última avaliação já preenchidas">
              Para não fazê-la responder tudo de novo, o formulário começa com as respostas anteriores. Confirme com
              ela só o que pode ter mudado.
            </Aviso>
          )}
          {FONAR.map((bloco) => (
            <section key={bloco.titulo} className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <h2 className="border-b border-slate-100 px-5 py-3.5 text-[15px] font-semibold text-slate-900">{bloco.titulo}</h2>
              <div className="divide-y divide-slate-100">
                {bloco.perguntas.map((p) => (
                  <fieldset key={p.id} className="px-5 py-4">
                    <legend className="mb-2 text-sm font-medium text-slate-800">
                      <span className="mr-1 text-slate-400">{p.numero}.</span> {p.texto}
                      {p.tipo === "multipla" && <span className="ml-1 text-xs font-normal text-slate-500">(pode marcar mais de uma)</span>}
                    </legend>
                    {p.ajuda && <p className="mb-2 text-xs text-slate-500">{p.ajuda}</p>}
                    <div className="flex flex-wrap gap-2">
                      {p.opcoes.map((o) => {
                        const marcado = (respostas[p.id] ?? []).includes(o.valor);
                        return (
                          <label
                            key={o.valor}
                            className={cx(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                              marcado
                                ? o.peso === "grave"
                                  ? "border-rose-300 bg-rose-50 text-rose-900"
                                  : "border-marca-400 bg-marca-50 text-marca-900"
                                : "border-slate-200 bg-white text-slate-700 hover:border-marca-300",
                            )}
                          >
                            <input
                              type={p.tipo === "unica" ? "radio" : "checkbox"}
                              name={p.id}
                              value={o.valor}
                              checked={marcado}
                              onChange={(e) => alternar(p, o.valor, e.target.checked)}
                              className="size-3.5 accent-marca-700"
                            />
                            {o.rotulo}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-marca-200 bg-white p-5 shadow-xs">
            <h2 className="text-[15px] font-semibold text-slate-900">Parte II — Avaliação da profissional</h2>
            <p className="mt-1 text-sm text-slate-600">
              A classificação final é sua, a partir da escuta e do contexto (a percepção dela sobre o próprio risco também
              conta). A sugestão ao lado é só um apoio.
            </p>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-slate-700">Classificação do risco</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["BAIXO", "MEDIO", "ELEVADO"] as const).map((n) => (
                  <label
                    key={n}
                    className={cx(
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
                      classificacao === n ? "border-marca-500 bg-marca-50 ring-2 ring-marca-200" : "border-slate-200 hover:border-marca-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="classificacao"
                      value={n}
                      required
                      checked={classificacao === n}
                      onChange={() => setClassificacao(n)}
                      className="accent-marca-700"
                    />
                    {ROTULO_RISCO[n]}
                    {resultado.sugestao === n && <span className="ml-auto text-xs font-normal text-slate-500">sugerido</span>}
                  </label>
                ))}
              </div>
              <ErroCampo nome="classificacao" />
            </fieldset>
            <div className="mt-4">
              <label htmlFor="justificativa" className="mb-1 block text-sm font-medium text-slate-700">
                Justificativa técnica {classificacao && classificacao !== resultado.sugestao && <span className="text-rose-600">*</span>}
              </label>
              <AreaTexto
                id="justificativa"
                name="justificativa"
                rows={4}
                placeholder="Contexto que pesa na avaliação: percepção dela, rede de apoio, histórico, providências tomadas…"
              />
              <ErroCampo nome="justificativa" />
            </div>
            <div className="mt-5 flex justify-end">
              <BotaoEnviar>Registrar avaliação</BotaoEnviar>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert className="size-4 text-marca-600" /> Sugestão automática
            </div>
            <SeloRisco nivel={resultado.respondidas === 0 ? "NAO_AVALIADO" : resultado.sugestao} grande />
            <p className="text-xs text-slate-500">
              {resultado.respondidas} de {total} perguntas respondidas
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-marca-500 transition-all" style={{ width: `${(resultado.respondidas / total) * 100}%` }} />
            </div>
            {resultado.fatoresGraves.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-rose-800 uppercase">Risco grave</p>
                <ul className="space-y-1 text-sm text-slate-800">
                  {resultado.fatoresGraves.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                      {f}
                      {resultado.criticos.includes(f) && <span className="text-xs font-semibold text-rose-700">crítico</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.fatoresAtencao.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-amber-800 uppercase">Atenção</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  {resultado.fatoresAtencao.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.aceitaAbrigamento && (
              <Aviso tom="atencao" icone={<Home className="size-4" />}>
                Ela aceita abrigamento: acione a casa-abrigo.
              </Aviso>
            )}
            <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
              Critério: qualquer fator crítico (arma de fogo, estrangulamento, sufocamento, tiro, facada) ou 3+ fatores
              graves sugere risco elevado; 1–2 graves ou 3+ de atenção, risco médio.
            </p>
          </div>
        </aside>
      </div>
    </FormAcao>
  );
}
