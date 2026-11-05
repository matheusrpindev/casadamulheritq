"use client";

import { BotaoEnviar, ErroCampo, FormAcao } from "@/components/form-acao";
import { Campo, Entrada } from "@/components/ui";
import { trocarSenha } from "./acoes";

export function FormularioSenha({ minimo }: { minimo: number }) {
  return (
    <FormAcao acao={trocarSenha} limparAoSalvar={false} className="space-y-4">
      <Campo rotulo="Senha atual" htmlFor="s-atual">
        <Entrada id="s-atual" name="atual" type="password" autoComplete="current-password" required />
        <ErroCampo nome="atual" />
      </Campo>
      <Campo rotulo="Nova senha" htmlFor="s-nova" dica={`Pelo menos ${minimo} caracteres. Ex.: “girassol azul na janela”.`}>
        <Entrada id="s-nova" name="nova" type="password" autoComplete="new-password" minLength={minimo} required />
        <ErroCampo nome="nova" />
      </Campo>
      <Campo rotulo="Confirme a nova senha" htmlFor="s-conf">
        <Entrada id="s-conf" name="confirmacao" type="password" autoComplete="new-password" required />
        <ErroCampo nome="confirmacao" />
      </Campo>
      <BotaoEnviar>Salvar nova senha</BotaoEnviar>
    </FormAcao>
  );
}
