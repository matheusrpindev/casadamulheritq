"use client";

import Link from "next/link";
import { AlertTriangle, HeartHandshake, MessageSquareQuote } from "lucide-react";
import { BotaoEnviar, ErroCampo, FormAcao, useEstadoAcao } from "@/components/form-acao";
import { CamposCadastro, type ValoresCadastro } from "@/components/campos-cadastro";
import { AreaTexto, Aviso, Campo, Entrada, Marcador, Secao } from "@/components/ui";
import { TIPOS_VIOLENCIA } from "@/lib/dominio";
import { DESCRICAO_VIOLENCIA, ROTULO_VIOLENCIA } from "@/lib/rotulos";
import { formatarData } from "@/lib/texto";
import { criarProntuario, type Duplicada } from "../acoes";

export function FormularioAcolhimento({ valores, tecnica, unidade }: { valores: ValoresCadastro; tecnica: boolean; unidade: string }) {
  return (
    <FormAcao acao={criarProntuario} limparAoSalvar={false} className="space-y-8">
      <Duplicidades />
      <CamposCadastro valores={valores} />

      <Secao titulo="Autorização para compartilhar com a rede" descricao="Pergunte a ela e registre a resposta. Ela pode mudar de ideia a qualquer momento.">
        <div className="mb-4 rounded-xl border border-marca-200 bg-marca-50/70 p-4 text-sm leading-relaxed text-marca-950">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <MessageSquareQuote className="size-4" /> Como explicar para ela
          </p>
          <p>
            “O que você me contar fica registrado aqui na {unidade}, com sigilo. Se você precisar ir à Casa da Mulher, à
            Secretaria ou a outro serviço da rede, posso deixar que a equipe de lá leia o seu atendimento — assim você
            não precisa contar tudo de novo. Só profissionais que vão te atender têm acesso, e fica registrado quem
            abriu. Você autoriza?”
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Marcador
            type="radio"
            name="compartilhamento"
            value="sim"
            required
            rotulo="Sim, ela autoriza"
            descricao="Unidades que receberem encaminhamento poderão ler o histórico."
          />
          <Marcador
            type="radio"
            name="compartilhamento"
            value="nao"
            required
            rotulo="Não autoriza (por enquanto)"
            descricao="O prontuário fica restrito à sua unidade. Encaminhamentos levam só a ficha de passagem."
          />
        </div>
      </Secao>

      {tecnica ? (
        <Secao
          titulo="Relato — escuta qualificada"
          descricao="O relato é registrado uma única vez e fica disponível para a rede. Ninguém mais precisará pedir que ela conte tudo de novo."
        >
          <Aviso tom="info" icone={<HeartHandshake className="size-4" />} className="mb-4" titulo="Para evitar a revitimização">
            Deixe que ela conte no tempo dela e registre com as palavras dela. Pergunte apenas o necessário para
            protegê-la — detalhes íntimos que não mudam o atendimento não precisam ser registrados. Você pode deixar o
            relato para depois e preencher só o cadastro agora.
          </Aviso>
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-medium text-slate-700">Formas de violência relatadas (Lei Maria da Penha, art. 7º)</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIPOS_VIOLENCIA.map((t) => (
                <Marcador key={t} name="relatoTipos" value={t} rotulo={ROTULO_VIOLENCIA[t]} descricao={DESCRICAO_VIOLENCIA[t]} />
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Campo rotulo="Data do fato (aprox.)" htmlFor="relatoDataFato">
              <Entrada id="relatoDataFato" name="relatoDataFato" type="date" />
            </Campo>
            <Campo rotulo="O que ela contou" htmlFor="relatoTexto" className="sm:col-span-2">
              <AreaTexto id="relatoTexto" name="relatoTexto" rows={10} className="texto-relato" placeholder="Registre o relato com as palavras dela…" />
              <ErroCampo nome="relatoTexto" />
            </Campo>
          </div>
        </Secao>
      ) : (
        <Aviso tom="info">O relato será registrado pela equipe técnica no atendimento. Aqui você faz só o cadastro.</Aviso>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <p className="mr-auto text-xs text-slate-500">Campos com * são obrigatórios. Tudo pode ser completado depois.</p>
        <BotaoEnviar>Abrir prontuário</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

function Duplicidades() {
  const estado = useEstadoAcao();
  const duplicadas = (estado.dados?.duplicadas as Duplicada[] | undefined) ?? [];
  if (duplicadas.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <AlertTriangle className="size-4" /> Ela pode já ter prontuário na rede
      </p>
      <ul className="mt-3 space-y-2">
        {duplicadas.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-amber-200">
            <span>
              <strong>{d.nome}</strong> · nasc. {formatarData(d.dataNascimento)} <span className="text-amber-800">({d.motivo})</span>
            </span>
            <Link href={`/busca?q=${encodeURIComponent(d.nome)}`} className="text-sm font-medium text-marca-700 underline">
              Ver na busca
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-amber-900">
        Se for a mesma mulher, use o prontuário existente (peça acesso pela busca). Prontuário duplicado faz com que ela
        tenha que contar a história de novo.
      </p>
      <div className="mt-3">
        <BotaoEnviar variante="secundario" tamanho="sm" name="confirmarNovo" value="sim">
          Conferi: é outra pessoa — abrir novo prontuário
        </BotaoEnviar>
      </div>
    </div>
  );
}
