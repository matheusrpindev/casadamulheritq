"use client";

import { ESCOLARIDADES, IDENTIDADES_GENERO, RACAS_COR } from "@/lib/rotulos";
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
};

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
            <legend className="mb-1 text-sm font-medium text-slate-700">É seguro ligar para esse número?</legend>
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

      <Secao titulo="Endereço" descricao="Criptografado. O bairro é usado apenas em indicadores agregados.">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <CampoTexto nome="endereco" rotulo="Endereço" valor={valores.endereco} autoComplete="off" />
          <CampoTexto nome="bairro" rotulo="Bairro" valor={valores.bairro} autoComplete="off" />
        </div>
      </Secao>
    </>
  );
}
