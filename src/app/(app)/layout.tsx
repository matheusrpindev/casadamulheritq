import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { podeGerirUnidades, podeGerirUsuarios, podeVerAuditoria, podeVerIndicadores } from "@/lib/permissoes";
import { MINUTOS_BLOQUEIO_TELA, NOME_SISTEMA } from "@/lib/config";
import { ROTULO_PAPEL } from "@/lib/rotulos";
import { Navegacao, type ItemMenu } from "@/components/navegacao";
import { GuardaInatividade } from "@/components/guarda-inatividade";
import { FaixaValidacao } from "@/components/faixa-validacao";

export default async function LayoutAutenticado({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });

  const [{ pendentes }] = await db
    .select({ pendentes: count() })
    .from(schema.encaminhamentos)
    .where(
      and(
        eq(schema.encaminhamentos.destinoUnidadeId, usuario.unidadeId),
        eq(schema.encaminhamentos.status, "ENVIADO"),
      ),
    );

  const atendimento: ItemMenu[] =
    usuario.papel === "ADMIN"
      ? []
      : [
          { href: "/", rotulo: "Início", icone: "inicio" },
          { href: "/busca", rotulo: "Buscar mulher", icone: "busca" },
          { href: "/prontuarios/novo", rotulo: "Novo acolhimento", icone: "novo" },
          { href: "/encaminhamentos", rotulo: "Encaminhamentos", icone: "encaminhamentos", contador: pendentes },
        ];

  const gestao: ItemMenu[] = [
    ...(podeVerIndicadores(usuario) ? [{ href: "/relatorios", rotulo: "Relatórios", icone: "indicadores" } as const] : []),
    ...(podeVerAuditoria(usuario) ? [{ href: "/auditoria", rotulo: "Auditoria", icone: "auditoria" } as const] : []),
    ...(podeGerirUsuarios(usuario) ? [{ href: "/admin/usuarios", rotulo: "Equipe", icone: "usuarios" } as const] : []),
    ...(podeGerirUnidades(usuario) ? [{ href: "/admin/unidades", rotulo: "Unidades da rede", icone: "unidades" } as const] : []),
  ];

  const grupos = [
    ...(atendimento.length ? [{ itens: atendimento }] : []),
    ...(gestao.length ? [{ titulo: "Gestão", itens: gestao }] : []),
  ];

  return (
    <div className="min-h-screen">
      <Navegacao
        grupos={grupos}
        nomeSistema={NOME_SISTEMA}
        usuario={{
          nome: usuario.nome,
          papel: ROTULO_PAPEL[usuario.papel],
          unidade: usuario.unidade.sigla,
          cor: usuario.unidade.cor,
        }}
      />
      <GuardaInatividade minutos={MINUTOS_BLOQUEIO_TELA} />
      <main className="lg:pl-64">
        <FaixaValidacao />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
