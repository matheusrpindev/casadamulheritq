"use client";

import { useState, type ReactNode } from "react";
import { Lock, Plus, Send, X } from "lucide-react";
import { BotaoEnviar, ErroCampo, FormAcao } from "@/components/form-acao";
import { CamposCadastro, type ValoresCadastro } from "@/components/campos-cadastro";
import { AreaTexto, Aviso, Campo, Entrada, Marcador, Seletor, classeBotao, cx } from "@/components/ui";
import { STATUS_MEDIDA, TIPOS_ATENDIMENTO, TIPOS_VIOLENCIA, URGENCIAS, VINCULOS_AUTOR, type Sigilo } from "@/lib/dominio";
import {
  DESCRICAO_SIGILO,
  MEDIDAS_PROTETIVAS_COMUNS,
  ROTULO_SIGILO,
  ROTULO_STATUS_MEDIDA,
  ROTULO_TIPO_ATENDIMENTO,
  ROTULO_URGENCIA,
  ROTULO_VINCULO,
  ROTULO_VIOLENCIA,
} from "@/lib/rotulos";
import {
  alterarConsentimento,
  alterarStatusProntuario,
  atualizarCadastro,
  atualizarEncaminhamento,
  atualizarMedida,
  criarEncaminhamento,
  registrarAtendimento,
  registrarAutor,
  registrarMedida,
  registrarRelato,
  registrarRetificacao,
  revisarAcesso,
} from "../acoes";

/** Bloco recolhível com botão "Novo …". */
export function Expansivel({
  rotulo,
  children,
  abertoInicial = false,
  id,
}: {
  rotulo: string;
  children: ReactNode;
  abertoInicial?: boolean;
  id?: string;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  if (!aberto) {
    return (
      <button id={id} type="button" onClick={() => setAberto(true)} className={classeBotao("primario", "md")}>
        <Plus className="size-4" /> {rotulo}
      </button>
    );
  }
  return (
    <div id={id} className="relative rounded-2xl border border-lilas-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="absolute top-3 right-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>
      <p className="mb-4 text-sm font-semibold text-slate-900">{rotulo}</p>
      {children}
    </div>
  );
}

function EscolhaSigilo({ permitidos, especialidade }: { permitidos: Sigilo[]; especialidade: string | null }) {
  return (
    <fieldset>
      <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Lock className="size-3.5" /> Quem pode ler este registro
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {permitidos.map((s) => (
          <Marcador
            key={s}
            type="radio"
            name="sigilo"
            value={s}
            defaultChecked={s === "REDE"}
            rotulo={s === "ESPECIALIDADE" && especialidade ? `Só ${especialidade}` : ROTULO_SIGILO[s]}
            descricao={DESCRICAO_SIGILO[s]}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function FormRelato({
  prontuarioId,
  sigilos,
  especialidade,
}: {
  prontuarioId: string;
  sigilos: Sigilo[];
  especialidade: string | null;
}) {
  return (
    <FormAcao acao={registrarRelato.bind(null, prontuarioId)} className="space-y-4">
      <Aviso tom="info">
        Registre com as palavras dela. Use este espaço para fatos novos ou complementos — o que já está registrado não
        precisa ser perguntado de novo.
      </Aviso>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Formas de violência</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_VIOLENCIA.map((t) => (
            <Marcador key={t} name="tiposViolencia" value={t} rotulo={ROTULO_VIOLENCIA[t]} />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Data do fato (aprox.)" htmlFor="r-data">
          <Entrada id="r-data" name="dataFato" type="date" />
        </Campo>
        <Campo rotulo="Local" htmlFor="r-local">
          <Entrada id="r-local" name="localFato" placeholder="Ex.: na residência do casal" />
        </Campo>
      </div>
      <Campo rotulo="Relato" htmlFor="r-texto" obrigatorio>
        <AreaTexto id="r-texto" name="texto" rows={8} required className="texto-relato" />
        <ErroCampo nome="texto" />
      </Campo>
      <EscolhaSigilo permitidos={sigilos} especialidade={especialidade} />
      <div className="flex justify-end">
        <BotaoEnviar>Registrar relato</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function FormAtendimento({
  prontuarioId,
  sigilos,
  especialidade,
  agora,
}: {
  prontuarioId: string;
  sigilos: Sigilo[];
  especialidade: string | null;
  agora: string;
}) {
  return (
    <FormAcao acao={registrarAtendimento.bind(null, prontuarioId)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Tipo" htmlFor="a-tipo" obrigatorio>
          <Seletor id="a-tipo" name="tipo" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {TIPOS_ATENDIMENTO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_ATENDIMENTO[t]}
              </option>
            ))}
          </Seletor>
          <ErroCampo nome="tipo" />
        </Campo>
        <Campo rotulo="Data e hora" htmlFor="a-quando" obrigatorio>
          <Entrada id="a-quando" name="realizadoEm" type="datetime-local" defaultValue={agora} max={agora} required />
          <ErroCampo nome="realizadoEm" />
        </Campo>
      </div>
      <Campo rotulo="Evolução / o que foi feito" htmlFor="a-texto" obrigatorio dica="Registre condutas, orientações e próximos passos.">
        <AreaTexto id="a-texto" name="texto" rows={6} required />
        <ErroCampo nome="texto" />
      </Campo>
      <EscolhaSigilo permitidos={sigilos} especialidade={especialidade} />
      <div className="flex justify-end">
        <BotaoEnviar>Registrar atendimento</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function FormRetificacao({ tipo, id, textoAtual }: { tipo: "relato" | "atendimento"; id: string; textoAtual: string }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-xs font-medium text-lilas-700 hover:underline">
        Retificar
      </button>
    );
  }
  return (
    <FormAcao acao={registrarRetificacao.bind(null, { tipo, id })} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-600">
        Registros não são apagados nem editados. A retificação cria uma nova versão; a original fica guardada e marcada
        como retificada.
      </p>
      <Campo rotulo="Texto corrigido" htmlFor={`ret-${id}`}>
        <AreaTexto id={`ret-${id}`} name="texto" rows={5} defaultValue={textoAtual} required />
      </Campo>
      <Campo rotulo="Motivo da retificação" htmlFor={`mot-${id}`}>
        <Entrada id={`mot-${id}`} name="motivo" required placeholder="Ex.: data informada errada; nome trocado" />
        <ErroCampo nome="motivo" />
      </Campo>
      <div className="flex gap-2">
        <BotaoEnviar tamanho="sm">Registrar retificação</BotaoEnviar>
        <button type="button" className={classeBotao("fantasma", "sm")} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </FormAcao>
  );
}

export function FormEncaminhamento({
  prontuarioId,
  unidades,
  compartilhamentoAutorizado,
}: {
  prontuarioId: string;
  unidades: { id: string; nome: string }[];
  compartilhamentoAutorizado: boolean;
}) {
  const [destino, setDestino] = useState("");
  return (
    <FormAcao acao={criarEncaminhamento.bind(null, prontuarioId)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Campo rotulo="Para onde" htmlFor="e-destino" obrigatorio>
          <Seletor id="e-destino" name="destinoUnidadeId" required value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="" disabled>
              Selecione a unidade…
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
            <option value="externo">Serviço fora do sistema (Defensoria, Fórum, Conselho Tutelar…)</option>
          </Seletor>
          <ErroCampo nome="destinoUnidadeId" />
        </Campo>
        <Campo rotulo="Urgência" htmlFor="e-urg">
          <Seletor id="e-urg" name="urgencia" defaultValue="ROTINA">
            {URGENCIAS.map((u) => (
              <option key={u} value={u}>
                {ROTULO_URGENCIA[u]}
              </option>
            ))}
          </Seletor>
        </Campo>
      </div>
      {destino === "externo" && (
        <Campo rotulo="Nome do serviço externo" htmlFor="e-ext" obrigatorio>
          <Entrada id="e-ext" name="destinoExterno" required placeholder="Ex.: Defensoria Pública — Núcleo da Mulher" />
        </Campo>
      )}
      <Campo
        rotulo="Ficha de passagem"
        htmlFor="e-motivo"
        obrigatorio
        dica="O que a próxima equipe precisa saber para recebê-la bem: por que está sendo encaminhada, o que já foi feito, cuidados (ex.: horário seguro, presença dos filhos)."
      >
        <AreaTexto id="e-motivo" name="motivo" rows={5} required minLength={20} />
        <ErroCampo nome="motivo" />
      </Campo>
      {destino && destino !== "externo" && (
        compartilhamentoAutorizado ? (
          <Aviso tom="sucesso">Ela autorizou o compartilhamento: a unidade de destino poderá ler o histórico assim que você enviar.</Aviso>
        ) : (
          <Marcador
            name="autorizouDestino"
            rotulo="Ela autorizou que esta unidade leia o prontuário"
            descricao="Sem a autorização dela, a unidade de destino recebe só a ficha de passagem."
          />
        )
      )}
      <div className="flex justify-end">
        <BotaoEnviar>
          <Send className="size-4" /> Encaminhar
        </BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function AcoesEncaminhamento({
  id,
  podeReceber,
  podeConcluir,
  podeRecusar,
  podeCancelar,
}: {
  id: string;
  podeReceber: boolean;
  podeConcluir: boolean;
  podeRecusar: boolean;
  podeCancelar: boolean;
}) {
  const [modo, setModo] = useState<"concluir" | "recusar" | "cancelar" | null>(null);
  const acao = atualizarEncaminhamento.bind(null, id);
  if (!podeReceber && !podeConcluir && !podeRecusar && !podeCancelar) return null;

  if (modo) {
    const textos = {
      concluir: { rotulo: "Devolutiva para a unidade de origem (opcional)", botao: "Concluir", obrigatorio: false },
      recusar: { rotulo: "Por que a unidade não pode atender? Sugira outro caminho.", botao: "Recusar e devolver", obrigatorio: true },
      cancelar: { rotulo: "Motivo do cancelamento (opcional)", botao: "Cancelar encaminhamento", obrigatorio: false },
    }[modo];
    return (
      <FormAcao acao={acao} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input type="hidden" name="operacao" value={modo} />
        <Campo rotulo={textos.rotulo} htmlFor={`resp-${id}`}>
          <AreaTexto id={`resp-${id}`} name="resposta" rows={3} required={textos.obrigatorio} />
          <ErroCampo nome="resposta" />
        </Campo>
        <div className="flex gap-2">
          <BotaoEnviar tamanho="sm" variante={modo === "concluir" ? "primario" : "perigo"}>
            {textos.botao}
          </BotaoEnviar>
          <button type="button" className={classeBotao("fantasma", "sm")} onClick={() => setModo(null)}>
            Voltar
          </button>
        </div>
      </FormAcao>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {podeReceber && (
        <FormAcao acao={acao} limparAoSalvar={false}>
          <input type="hidden" name="operacao" value="receber" />
          <BotaoEnviar tamanho="sm">Ela chegou — confirmar recebimento</BotaoEnviar>
        </FormAcao>
      )}
      {podeConcluir && (
        <button type="button" className={classeBotao("secundario", "sm")} onClick={() => setModo("concluir")}>
          Concluir
        </button>
      )}
      {podeRecusar && (
        <button type="button" className={classeBotao("fantasma", "sm", "text-rose-700")} onClick={() => setModo("recusar")}>
          Não podemos atender
        </button>
      )}
      {podeCancelar && (
        <button type="button" className={classeBotao("fantasma", "sm", "text-slate-600")} onClick={() => setModo("cancelar")}>
          Cancelar encaminhamento
        </button>
      )}
    </div>
  );
}

export function FormAutor({ prontuarioId }: { prontuarioId: string }) {
  return (
    <FormAcao acao={registrarAutor.bind(null, prontuarioId)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome ou apelido" htmlFor="au-nome" obrigatorio>
          <Entrada id="au-nome" name="nome" required autoComplete="off" />
          <ErroCampo nome="nome" />
        </Campo>
        <Campo rotulo="Vínculo com ela" htmlFor="au-vinc" obrigatorio>
          <Seletor id="au-vinc" name="vinculo" required defaultValue="">
            <option value="" disabled>
              Selecione…
            </option>
            {VINCULOS_AUTOR.map((v) => (
              <option key={v} value={v}>
                {ROTULO_VINCULO[v]}
              </option>
            ))}
          </Seletor>
        </Campo>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Tem acesso a arma de fogo?</legend>
        <div className="flex flex-wrap gap-2">
          <Marcador type="radio" name="acessoArma" value="SIM" rotulo="Sim" />
          <Marcador type="radio" name="acessoArma" value="NAO" rotulo="Não" />
          <Marcador type="radio" name="acessoArma" value="NAO_SABE" defaultChecked rotulo="Não sabe" />
        </div>
      </fieldset>
      <Campo rotulo="Observações" htmlFor="au-obs" dica="Ex.: local de trabalho, veículo, se costuma aparecer em algum lugar.">
        <AreaTexto id="au-obs" name="observacoes" rows={3} />
      </Campo>
      <div className="flex justify-end">
        <BotaoEnviar>Registrar</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function FormMedida({ prontuarioId }: { prontuarioId: string }) {
  return (
    <FormAcao acao={registrarMedida.bind(null, prontuarioId)} className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Medidas</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MEDIDAS_PROTETIVAS_COMUNS.map((m) => (
            <Marcador key={m} name="medidas" value={m} rotulo={m} />
          ))}
        </div>
        <Entrada name="medidaOutra" className="mt-2" placeholder="Outra medida (descreva)" />
        <ErroCampo nome="medidas" />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo rotulo="Situação" htmlFor="m-status" obrigatorio>
          <Seletor id="m-status" name="status" defaultValue="SOLICITADA">
            {STATUS_MEDIDA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_MEDIDA[s]}
              </option>
            ))}
          </Seletor>
        </Campo>
        <Campo rotulo="Solicitada em" htmlFor="m-sol">
          <Entrada id="m-sol" name="solicitadaEm" type="date" />
        </Campo>
        <Campo rotulo="Decidida em" htmlFor="m-dec">
          <Entrada id="m-dec" name="decididaEm" type="date" />
        </Campo>
        <Campo rotulo="Válida até" htmlFor="m-val">
          <Entrada id="m-val" name="validaAte" type="date" />
        </Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Campo rotulo="Nº do processo" htmlFor="m-proc">
          <Entrada id="m-proc" name="numeroProcesso" placeholder="0000000-00.0000.8.26.0000" />
        </Campo>
        <Campo rotulo="Observações" htmlFor="m-obs">
          <Entrada id="m-obs" name="observacoes" placeholder="Ex.: distância mínima de 300 m" />
        </Campo>
      </div>
      <div className="flex justify-end">
        <BotaoEnviar>Registrar medida</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function FormAtualizarMedida({ id, status, validaAte }: { id: string; status: string; validaAte: string | null }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-xs font-medium text-lilas-700 hover:underline">
        Atualizar situação
      </button>
    );
  }
  return (
    <FormAcao acao={atualizarMedida.bind(null, id)} limparAoSalvar={false} className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <Campo rotulo="Situação" htmlFor={`ms-${id}`}>
        <Seletor id={`ms-${id}`} name="status" defaultValue={status}>
          {STATUS_MEDIDA.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS_MEDIDA[s]}
            </option>
          ))}
        </Seletor>
      </Campo>
      <Campo rotulo="Válida até" htmlFor={`mv-${id}`}>
        <Entrada id={`mv-${id}`} name="validaAte" type="date" defaultValue={validaAte ?? ""} />
      </Campo>
      <Campo rotulo="Nº do processo" htmlFor={`mp-${id}`}>
        <Entrada id={`mp-${id}`} name="numeroProcesso" />
      </Campo>
      <BotaoEnviar tamanho="sm">Salvar</BotaoEnviar>
    </FormAcao>
  );
}

export function FormCadastro({ prontuarioId, valores }: { prontuarioId: string; valores: ValoresCadastro }) {
  return (
    <FormAcao acao={atualizarCadastro.bind(null, prontuarioId)} limparAoSalvar={false} className="space-y-8">
      <CamposCadastro valores={valores} />
      <div className="flex justify-end border-t border-slate-100 pt-5">
        <BotaoEnviar>Salvar alterações</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function FormConsentimento({ prontuarioId, autorizado }: { prontuarioId: string; autorizado: boolean }) {
  return (
    <FormAcao
      acao={alterarConsentimento.bind(null, prontuarioId)}
      limparAoSalvar={false}
      confirmar={
        autorizado
          ? "Registrar que ela RETIROU a autorização de compartilhamento com a rede?"
          : "Registrar que ela AUTORIZOU o compartilhamento com a rede?"
      }
    >
      <input type="hidden" name="compartilhamento" value={autorizado ? "nao" : "sim"} />
      <BotaoEnviar variante={autorizado ? "secundario" : "primario"} tamanho="sm">
        {autorizado ? "Ela retirou a autorização" : "Ela autorizou o compartilhamento"}
      </BotaoEnviar>
    </FormAcao>
  );
}

export function FormStatus({ prontuarioId, arquivado }: { prontuarioId: string; arquivado: boolean }) {
  return (
    <FormAcao
      acao={alterarStatusProntuario.bind(null, prontuarioId)}
      limparAoSalvar={false}
      confirmar={arquivado ? "Reativar este prontuário?" : "Arquivar este prontuário? Ele continua disponível para consulta."}
    >
      <input type="hidden" name="status" value={arquivado ? "ATIVO" : "ARQUIVADO"} />
      <BotaoEnviar variante="secundario" tamanho="sm">
        {arquivado ? "Reativar prontuário" : "Arquivar prontuário"}
      </BotaoEnviar>
    </FormAcao>
  );
}

export function FormRevisarAcesso({ acessoId, jaRevisado }: { acessoId: string; jaRevisado: boolean }) {
  const acao = revisarAcesso.bind(null, acessoId);
  return (
    <div className="flex flex-wrap gap-2">
      {!jaRevisado && (
        <FormAcao acao={acao} limparAoSalvar={false}>
          <input type="hidden" name="decisao" value="ok" />
          <BotaoEnviar variante="secundario" tamanho="sm">
            Acesso justificado
          </BotaoEnviar>
        </FormAcao>
      )}
      <FormAcao acao={acao} limparAoSalvar={false} confirmar="Revogar o acesso desta unidade ao prontuário?">
        <input type="hidden" name="decisao" value="revogar" />
        <BotaoEnviar variante="secundario" tamanho="sm" className={cx("text-rose-700")}>
          Revogar acesso
        </BotaoEnviar>
      </FormAcao>
    </div>
  );
}
