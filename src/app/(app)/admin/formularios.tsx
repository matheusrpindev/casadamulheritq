"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { BotaoEnviar, ErroCampo, FormAcao, useEstadoAcao } from "@/components/form-acao";
import { Campo, Entrada, Seletor, classeBotao } from "@/components/ui";
import { ESPECIALIDADES, TIPOS_UNIDADE, type Papel } from "@/lib/dominio";
import { IDENTIDADES, ROTULO_IDENTIDADE, identidadePadrao, type Identidade } from "@/lib/identidade";
import { ROTULO_ESPECIALIDADE, ROTULO_PAPEL, ROTULO_TIPO_UNIDADE } from "@/lib/rotulos";
import { alternarAtivo, alternarUnidade, criarUsuario, redefinirSenha, salvarUnidade } from "./acoes";

function SenhaGerada() {
  const estado = useEstadoAcao();
  const senha = estado.ok ? (estado.dados?.senha as string | undefined) : undefined;
  if (!senha) return null;
  return (
    <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="flex items-center gap-2 font-semibold">
        <KeyRound className="size-4" /> Senha temporária (aparece só agora)
      </p>
      <p className="mt-2 font-mono text-base tracking-wide select-all">{senha}</p>
      <p className="mt-2 text-xs">
        Entregue pessoalmente a {String(estado.dados?.email)}. Ela terá que criar uma senha nova no primeiro acesso. Não
        envie por WhatsApp junto com o e-mail.
      </p>
    </div>
  );
}

export function FormNovoUsuario({
  papeis,
  unidades,
}: {
  papeis: Papel[];
  /** Só para a administração; gestão cria na própria unidade. */
  unidades?: { id: string; nome: string; identidade: Identidade }[];
}) {
  const [papel, setPapel] = useState<Papel>(papeis.includes("TECNICA") ? "TECNICA" : papeis[0]);
  const [unidadeId, setUnidadeId] = useState("");
  const identidadeEscolhida = unidades?.find((u) => u.id === unidadeId)?.identidade;
  return (
    <FormAcao acao={criarUsuario} className="space-y-4">
      <SenhaGerada />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome completo" htmlFor="u-nome" obrigatorio>
          <Entrada id="u-nome" name="nome" required />
          <ErroCampo nome="nome" />
        </Campo>
        <Campo rotulo="E-mail" htmlFor="u-email" obrigatorio>
          <Entrada id="u-email" name="email" type="email" required autoComplete="off" />
          <ErroCampo nome="email" />
        </Campo>
        {unidades && (
          <Campo rotulo="Unidade" htmlFor="u-unidade" obrigatorio>
            <Seletor id="u-unidade" name="unidadeId" required value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
              <option value="" disabled>
                Selecione…
              </option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Seletor>
            <ErroCampo nome="unidadeId" />
            {identidadeEscolhida && (
              <p className="mt-1 text-xs text-zinc-500">Ela verá a identidade visual da {ROTULO_IDENTIDADE[identidadeEscolhida]}.</p>
            )}
          </Campo>
        )}
        <Campo rotulo="Perfil" htmlFor="u-papel" obrigatorio>
          <Seletor id="u-papel" name="papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
            {papeis.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </Seletor>
        </Campo>
        {(papel === "TECNICA" || papel === "GESTORA") && (
          <>
            <Campo rotulo="Especialidade" htmlFor="u-esp" obrigatorio={papel === "TECNICA"} dica="Define quem pode ler registros restritos à especialidade.">
              <Seletor id="u-esp" name="especialidade" defaultValue="">
                <option value="">—</option>
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>
                    {ROTULO_ESPECIALIDADE[e]}
                  </option>
                ))}
              </Seletor>
              <ErroCampo nome="especialidade" />
            </Campo>
            <Campo rotulo="Registro profissional" htmlFor="u-reg" dica="CRP, CRESS, OAB…">
              <Entrada id="u-reg" name="registroProfissional" />
            </Campo>
          </>
        )}
      </div>
      <div className="flex justify-end">
        <BotaoEnviar>Criar conta</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function AcoesUsuario({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <FormAcao acao={redefinirSenha.bind(null, id)} limparAoSalvar={false} confirmar={`Gerar nova senha temporária para ${nome}? A sessão atual dela será encerrada.`}>
          <SenhaGerada />
          <BotaoEnviar variante="secundario" tamanho="sm">
            Redefinir senha
          </BotaoEnviar>
        </FormAcao>
        <FormAcao acao={alternarAtivo.bind(null, id)} limparAoSalvar={false} confirmar={ativo ? `Desativar a conta de ${nome}?` : `Reativar a conta de ${nome}?`}>
          <BotaoEnviar variante="secundario" tamanho="sm">
            {ativo ? "Desativar" : "Reativar"}
          </BotaoEnviar>
        </FormAcao>
      </div>
    </div>
  );
}

type ValoresUnidade = {
  nome: string;
  sigla: string;
  tipo: string;
  endereco: string | null;
  telefone: string | null;
  cor: string;
  identidade: Identidade;
};

export function FormUnidade({ id, valores, aoFechar }: { id: string | null; valores?: ValoresUnidade; aoFechar?: () => void }) {
  const [tipo, setTipo] = useState(valores?.tipo ?? "CASA_DA_MULHER");
  const [identidade, setIdentidade] = useState<Identidade>(valores?.identidade ?? identidadePadrao(tipo));
  const [escolheuIdentidade, setEscolheuIdentidade] = useState(!!valores);
  return (
    <FormAcao acao={salvarUnidade.bind(null, id)} limparAoSalvar={!id} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Campo rotulo="Nome" htmlFor={`un-nome-${id}`} obrigatorio>
          <Entrada id={`un-nome-${id}`} name="nome" defaultValue={valores?.nome} required />
          <ErroCampo nome="nome" />
        </Campo>
        <Campo rotulo="Sigla" htmlFor={`un-sigla-${id}`} obrigatorio>
          <Entrada id={`un-sigla-${id}`} name="sigla" defaultValue={valores?.sigla} required maxLength={12} />
        </Campo>
        <Campo rotulo="Tipo" htmlFor={`un-tipo-${id}`}>
          <Seletor
            id={`un-tipo-${id}`}
            name="tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              // Ao cadastrar, a identidade acompanha o tipo até a pessoa escolher outra.
              if (!escolheuIdentidade) setIdentidade(identidadePadrao(e.target.value));
            }}
          >
            {TIPOS_UNIDADE.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_UNIDADE[t]}
              </option>
            ))}
          </Seletor>
        </Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
        <Campo rotulo="Endereço" htmlFor={`un-end-${id}`}>
          <Entrada id={`un-end-${id}`} name="endereco" defaultValue={valores?.endereco ?? ""} />
        </Campo>
        <Campo rotulo="Telefone" htmlFor={`un-tel-${id}`}>
          <Entrada id={`un-tel-${id}`} name="telefone" defaultValue={valores?.telefone ?? ""} />
        </Campo>
        <Campo rotulo="Cor" htmlFor={`un-cor-${id}`}>
          <input id={`un-cor-${id}`} name="cor" type="color" defaultValue={valores?.cor ?? "#7c3aed"} className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1" />
        </Campo>
      </div>
      <Campo
        rotulo="Identidade visual"
        htmlFor={`un-ident-${id}`}
        dica="Logos e cores que as pessoas desta unidade veem no sistema e nas impressões."
      >
        <Seletor
          id={`un-ident-${id}`}
          name="identidade"
          value={identidade}
          onChange={(e) => {
            setIdentidade(e.target.value as Identidade);
            setEscolheuIdentidade(true);
          }}
        >
          {IDENTIDADES.map((i) => (
            <option key={i} value={i}>
              {ROTULO_IDENTIDADE[i]}
            </option>
          ))}
        </Seletor>
      </Campo>
      <div className="flex justify-end gap-2">
        {aoFechar && (
          <button type="button" className={classeBotao("fantasma")} onClick={aoFechar}>
            Fechar
          </button>
        )}
        <BotaoEnviar>{id ? "Salvar" : "Cadastrar unidade"}</BotaoEnviar>
      </div>
    </FormAcao>
  );
}

export function LinhaUnidadeAcoes({ id, ativa, valores }: { id: string; ativa: boolean; valores: ValoresUnidade }) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="w-full">
      <div className="flex justify-end gap-2">
        <button type="button" className={classeBotao("secundario", "sm")} onClick={() => setEditando((v) => !v)}>
          Editar
        </button>
        <FormAcao acao={alternarUnidade.bind(null, id)} limparAoSalvar={false} confirmar={ativa ? "Desativar esta unidade? As contas dela deixam de entrar." : "Reativar esta unidade?"}>
          <BotaoEnviar variante="secundario" tamanho="sm">
            {ativa ? "Desativar" : "Reativar"}
          </BotaoEnviar>
        </FormAcao>
      </div>
      {editando && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
          <FormUnidade id={id} valores={valores} aoFechar={() => setEditando(false)} />
        </div>
      )}
    </div>
  );
}
