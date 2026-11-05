"use client";

import { BotaoEnviar, FormAcao } from "@/components/form-acao";
import { Campo, Entrada } from "@/components/ui";
import { entrar } from "./acoes";

export function FormularioLogin() {
  return (
    <FormAcao acao={entrar} limparAoSalvar={false} className="space-y-4">
      <Campo rotulo="E-mail" htmlFor="email">
        <Entrada id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Campo>
      <Campo rotulo="Senha" htmlFor="senha">
        <Entrada id="senha" name="senha" type="password" autoComplete="current-password" required />
      </Campo>
      <BotaoEnviar className="w-full">Entrar</BotaoEnviar>
    </FormAcao>
  );
}
