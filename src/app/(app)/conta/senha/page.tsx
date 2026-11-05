import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/sessao";
import { ROTULO_ESPECIALIDADE, ROTULO_PAPEL } from "@/lib/rotulos";
import { TAMANHO_MINIMO_SENHA } from "@/lib/senha";
import { Aviso, Cartao, DadoRotulado, TituloPagina } from "@/components/ui";
import { FormularioSenha } from "./formulario";

export const metadata: Metadata = { title: "Minha conta" };

export default async function PaginaConta() {
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <TituloPagina titulo="Minha conta" />
      {usuario.precisaTrocarSenha && (
        <Aviso tom="atencao" titulo="Crie sua senha pessoal para continuar">
          Você entrou com uma senha temporária. Escolha uma senha que só você saiba — de preferência uma frase com três ou
          quatro palavras.
        </Aviso>
      )}
      <Cartao className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DadoRotulado rotulo="Nome">{usuario.nome}</DadoRotulado>
          <DadoRotulado rotulo="E-mail">{usuario.email}</DadoRotulado>
          <DadoRotulado rotulo="Unidade">{usuario.unidade.nome}</DadoRotulado>
          <DadoRotulado rotulo="Perfil">
            {ROTULO_PAPEL[usuario.papel]}
            {usuario.especialidade && ` · ${ROTULO_ESPECIALIDADE[usuario.especialidade]}`}
          </DadoRotulado>
        </dl>
      </Cartao>
      <Cartao className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Trocar senha</h2>
        <FormularioSenha minimo={TAMANHO_MINIMO_SENHA} />
      </Cartao>
    </div>
  );
}
