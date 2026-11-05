import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/sessao";
import { podeCadastrar, podeRegistrarAtendimento } from "@/lib/permissoes";
import { Cartao, TituloPagina } from "@/components/ui";
import { FormularioAcolhimento } from "./formulario";

export const metadata: Metadata = { title: "Novo acolhimento" };

export default async function PaginaNovoAcolhimento({ searchParams }: PageProps<"/prontuarios/novo">) {
  const usuario = await exigirUsuario();
  if (!podeCadastrar(usuario)) redirect("/");
  const p = await searchParams;
  const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 160) : undefined);

  return (
    <div>
      <TituloPagina
        voltar={{ href: "/busca", rotulo: "Voltar para a busca" }}
        titulo="Novo acolhimento"
        descricao="Abra o prontuário só depois de buscar na rede. Comece pelo essencial — o restante pode ser completado ao longo dos atendimentos."
      />
      <Cartao className="p-5 sm:p-8">
        <FormularioAcolhimento
          tecnica={podeRegistrarAtendimento(usuario)}
          unidade={usuario.unidade.nome}
          valores={{ nomeCivil: texto(p.nome), cpf: texto(p.cpf), dataNascimento: texto(p.nasc) }}
        />
      </Cartao>
    </div>
  );
}
