import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { podeGerirUnidades } from "@/lib/permissoes";
import { ROTULO_TIPO_UNIDADE } from "@/lib/rotulos";
import { Cartao, Selo, TituloPagina, cx } from "@/components/ui";
import { Expansivel } from "../../prontuarios/[id]/formularios";
import { FormUnidade, LinhaUnidadeAcoes } from "../formularios";
import { ROTULO_CURTO_IDENTIDADE } from "@/lib/identidade";

export const metadata: Metadata = { title: "Unidades da rede" };

export default async function PaginaUnidades() {
  const ator = await exigirUsuario();
  if (!podeGerirUnidades(ator)) redirect("/");

  const [unidades, contas] = await Promise.all([
    db.select().from(schema.unidades).orderBy(asc(schema.unidades.nome)),
    db.select({ unidadeId: schema.usuarios.unidadeId, total: count() }).from(schema.usuarios).where(eq(schema.usuarios.ativo, true)).groupBy(schema.usuarios.unidadeId),
  ]);

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Unidades da rede"
        descricao="Pontos de atendimento que usam o prontuário único. Serviços que não usam o sistema (Fórum, Defensoria…) podem receber encaminhamentos como “serviço externo”, sem cadastro."
      />
      <Expansivel rotulo="Cadastrar unidade">
        <FormUnidade id={null} />
      </Expansivel>
      <Cartao>
        <ul className="divide-y divide-zinc-100">
          {unidades.map((u) => (
            <li key={u.id} className={cx("flex flex-wrap items-start gap-4 px-5 py-4", !u.ativa && "opacity-60")}>
              <span className="mt-1 size-3 shrink-0 rounded-full" style={{ backgroundColor: u.cor }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                  {u.nome} <Selo>{u.sigla}</Selo> <Selo tom="marca">{ROTULO_TIPO_UNIDADE[u.tipo]}</Selo>
                  <Selo tom="azul">Identidade: {ROTULO_CURTO_IDENTIDADE[u.identidade]}</Selo>
                  {!u.ativa && <Selo tom="vermelho">Inativa</Selo>}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {[u.endereco, u.telefone].filter(Boolean).join(" · ") || "Sem endereço cadastrado"} ·{" "}
                  {contas.find((c) => c.unidadeId === u.id)?.total ?? 0} conta(s) ativa(s)
                </p>
              </div>
              <div className="w-full sm:w-auto sm:min-w-64">
                <LinhaUnidadeAcoes id={u.id} ativa={u.ativa} valores={{ nome: u.nome, sigla: u.sigla, tipo: u.tipo, endereco: u.endereco, telefone: u.telefone, cor: u.cor, identidade: u.identidade }} />
              </div>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
