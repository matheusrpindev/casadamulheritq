import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/sessao";
import { buscarRegistros, carregarProntuario, ehUuid, mapasRede, montarConteudo } from "@/lib/dados/prontuario";
import { podeRegistrarAtendimento } from "@/lib/permissoes";
import { nomeExibicao } from "@/lib/texto";
import { TituloPagina } from "@/components/ui";
import { FormularioFonar } from "./formulario";

export const metadata: Metadata = { title: "Avaliação de risco" };

export default async function PaginaNovaAvaliacao({ params }: PageProps<"/prontuarios/[id]/risco/novo">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  if (!podeRegistrarAtendimento(usuario)) redirect(`/prontuarios/${id}`);
  const [carga, mapas, registros] = await Promise.all([
    carregarProntuario(usuario, id),
    mapasRede(),
    ehUuid(id) ? buscarRegistros(id) : null,
  ]);
  if (carga.situacao === "nao-encontrado") notFound();
  if (carga.situacao === "sem-acesso") redirect(`/prontuarios/${id}`);

  // Decifra só depois de confirmar o acesso.
  const conteudo = montarConteudo(usuario, registros!, mapas);
  const anteriores = conteudo.avaliacoes[0]?.respostas ?? null;

  return (
    <div>
      <TituloPagina
        voltar={{ href: `/prontuarios/${id}?aba=risco`, rotulo: `Voltar ao prontuário de ${nomeExibicao(carga.prontuario)}` }}
        titulo="Formulário Nacional de Avaliação de Risco"
        descricao="Parte I — leia as perguntas para ela, com calma. Ela pode não querer responder alguma; tudo bem marcar “Não sei” ou deixar em branco."
      />
      <FormularioFonar prontuarioId={id} anteriores={anteriores} />
    </div>
  );
}
