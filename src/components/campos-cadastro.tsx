"use client";

import {
  ESCOLARIDADES,
  ESTADOS_CIVIS,
  FAIXAS_RENDA,
  IDENTIDADES_GENERO,
  RACAS_COR,
  SITUACOES_MORADIA,
  SITUACOES_TRABALHO,
} from "@/lib/rotulos";
import { useErroCampo } from "./form-acao";
import { AreaTexto, Campo, Entrada, Marcador, Secao, Seletor } from "./ui";

export type ValoresCadastro = {
  nomeCivil?: string;
  nomeSocial?: string | null;
  dataNascimento?: string | null;
  cpf?: string | null;
  identidadeGenero?: string | null;
  racaCor?: string | null;
  escolaridade?: string | null;
  ocupacao?: string | null;
  telefone?: string | null;
  contatoSeguro?: boolean;
  podeDeixarRecado?: boolean;
  melhorHorario?: string | null;
  orientacoesContato?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  quantidadeFilhos?: number | null;
  filhosMenores?: number | null;
  gestante?: boolean | null;
  pessoaComDeficiencia?: boolean | null;
  estadoCivil?: string | null;
  situacaoTrabalho?: string | null;
  rendaFamiliar?: string | null;
  recebeBeneficio?: boolean | null;
  situacaoMoradia?: string | null;
  dependenciaFinanceira?: boolean | null;
};

const simNao = (v: boolean | null | undefined) => (v === true ? "sim" : v === false ? "nao" : "");

function CampoSimNao({ nome, rotulo, valor, dica }: { nome: string; rotulo: string; valor?: boolean | null; dica?: string }) {
  return (
    <Campo rotulo={rotulo} htmlFor={`c-${nome}`} dica={dica}>
      <Seletor id={`c-${nome}`} name={nome} defaultValue={simNao(valor)}>
        <option value="">Não informado</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </Seletor>
    </Campo>
  );
}

function CampoTexto({
  nome,
  rotulo,
  valor,
  obrigatorio,
  dica,
  className,
  ...props
}: {
  nome: string;
  rotulo: string;
  valor?: string | null;
  obrigatorio?: boolean;
  dica?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "name" | "defaultValue">) {
  const erro = useErroCampo(nome);
  return (
    <Campo rotulo={rotulo} htmlFor={`c-${nome}`} obrigatorio={obrigatorio} dica={dica} erro={erro} className={className}>
      <Entrada id={`c-${nome}`} name={nome} defaultValue={valor ?? ""} required={obrigatorio} aria-invalid={!!erro} {...props} />
    </Campo>
  );
}

function CampoLista({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor?: string | null; opcoes: readonly string[] }) {
  return (
    <Campo rotulo={rotulo} htmlFor={`c-${nome}`}>
      <Seletor id={`c-${nome}`} name={nome} defaultValue={valor ?? ""}>
        <option value="">Não informado</option>
        {opcoes.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </Seletor>
    </Campo>
  );
}

export function CamposCadastro({ valores = {} }: { valores?: ValoresCadastro }) {
  return (
    <>
      <Secao titulo="Identificação" descricao="Se ela usa nome social, é ele que aparece em todo o sistema.">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="nomeCivil" rotulo="Nome completo (registro civil)" valor={valores.nomeCivil} obrigatorio autoComplete="off" />
          <CampoTexto nome="nomeSocial" rotulo="Nome social" valor={valores.nomeSocial} autoComplete="off" />
          <CampoTexto nome="dataNascimento" rotulo="Data de nascimento" type="date" valor={valores.dataNascimento} />
          <CampoTexto
            nome="cpf"
            rotulo="CPF"
            valor={valores.cpf}
            inputMode="numeric"
            placeholder="000.000.000-00"
            dica="Opcional. Guardado criptografado; ajuda a evitar prontuários duplicados."
            autoComplete="off"
          />
          <CampoLista nome="identidadeGenero" rotulo="Identidade de gênero" valor={valores.identidadeGenero} opcoes={IDENTIDADES_GENERO} />
          <CampoLista nome="racaCor" rotulo="Raça/cor (autodeclarada)" valor={valores.racaCor} opcoes={RACAS_COR} />
          <CampoLista nome="escolaridade" rotulo="Escolaridade" valor={valores.escolaridade} opcoes={ESCOLARIDADES} />
          <CampoTexto nome="ocupacao" rotulo="Ocupação" valor={valores.ocupacao} />
        </div>
      </Secao>

      <Secao
        titulo="Contato seguro"
        descricao="Uma ligação na hora errada pode colocá-la em risco. Pergunte a ela como prefere ser contatada."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="telefone" rotulo="Telefone" valor={valores.telefone} type="tel" autoComplete="off" />
          <CampoTexto nome="melhorHorario" rotulo="Melhor horário para contato" valor={valores.melhorHorario} placeholder="Ex.: dias úteis, das 9h às 12h" />
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium text-zinc-700">É seguro ligar para esse número?</legend>
            <div className="flex flex-wrap gap-2">
              <Marcador type="radio" name="contatoSeguro" value="sim" defaultChecked={valores.contatoSeguro !== false} rotulo="Sim" />
              <Marcador
                type="radio"
                name="contatoSeguro"
                value="nao"
                defaultChecked={valores.contatoSeguro === false}
                rotulo="Não — o contato pode colocá-la em risco"
              />
              <Marcador name="podeDeixarRecado" defaultChecked={valores.podeDeixarRecado} rotulo="Pode deixar recado / mensagem" />
            </div>
          </fieldset>
          <Campo rotulo="Orientações para contato" htmlFor="c-orientacoesContato" className="sm:col-span-2">
            <AreaTexto
              id="c-orientacoesContato"
              name="orientacoesContato"
              rows={2}
              defaultValue={valores.orientacoesContato ?? ""}
              placeholder="Ex.: o agressor mexe no celular dela; ligar para a irmã (Joana) e se identificar como 'clínica'."
            />
          </Campo>
        </div>
      </Secao>

      <Secao
        titulo="Família e situação socioeconômica"
        descricao="Ajuda a planejar o atendimento (creche, benefício, moradia) e alimenta os relatórios — sempre de forma agregada, sem identificar ninguém."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            nome="quantidadeFilhos"
            rotulo="Quantos filhos tem"
            valor={valores.quantidadeFilhos?.toString()}
            type="number"
            min={0}
            max={20}
            dica="0 se não tem filhos."
          />
          <CampoTexto nome="filhosMenores" rotulo="Quantos são menores de 18" valor={valores.filhosMenores?.toString()} type="number" min={0} max={20} />
          <CampoSimNao nome="gestante" rotulo="Está gestante?" valor={valores.gestante} />
          <CampoLista nome="estadoCivil" rotulo="Estado civil" valor={valores.estadoCivil} opcoes={ESTADOS_CIVIS} />
          <CampoLista nome="situacaoTrabalho" rotulo="Trabalho" valor={valores.situacaoTrabalho} opcoes={SITUACOES_TRABALHO} />
          <CampoLista nome="rendaFamiliar" rotulo="Renda familiar" valor={valores.rendaFamiliar} opcoes={FAIXAS_RENDA} />
          <CampoSimNao nome="dependenciaFinanceira" rotulo="Depende financeiramente do autor?" valor={valores.dependenciaFinanceira} />
          <CampoSimNao nome="recebeBeneficio" rotulo="Recebe benefício social?" valor={valores.recebeBeneficio} dica="Bolsa Família, BPC, aluguel social…" />
          <CampoSimNao nome="pessoaComDeficiencia" rotulo="É pessoa com deficiência?" valor={valores.pessoaComDeficiencia} />
          <CampoLista nome="situacaoMoradia" rotulo="Moradia" valor={valores.situacaoMoradia} opcoes={SITUACOES_MORADIA} />
        </div>
      </Secao>

      <Secao titulo="Endereço" descricao="Criptografado. O bairro é usado apenas em relatórios agregados.">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <CampoTexto nome="endereco" rotulo="Endereço" valor={valores.endereco} autoComplete="off" />
          <CampoTexto nome="bairro" rotulo="Bairro" valor={valores.bairro} autoComplete="off" />
        </div>
      </Secao>
    </>
  );
}
