import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { papeisAtribuiveis, podeGerirUsuarios } from "@/lib/permissoes";
import { ROTULO_ESPECIALIDADE, ROTULO_PAPEL } from "@/lib/rotulos";
import { formatarDataHora } from "@/lib/texto";
import { CabecalhoCartao, Cartao, Selo, SeloUnidade, TituloPagina, cx } from "@/components/ui";
import { Avatar } from "@/components/selos";
import { Expansivel } from "../../prontuarios/[id]/formularios";
import { AcoesUsuario, FormNovoUsuario } from "../formularios";

export const metadata: Metadata = { title: "Equipe" };

export default async function PaginaUsuarios() {
  const ator = await exigirUsuario();
  if (!podeGerirUsuarios(ator)) redirect("/");
  const admin = ator.papel === "ADMIN";

  const [unidades, pessoas] = await Promise.all([
    db.select().from(schema.unidades).orderBy(asc(schema.unidades.nome)),
    db
      .select()
      .from(schema.usuarios)
      .where(admin ? undefined : eq(schema.usuarios.unidadeId, ator.unidadeId))
      .orderBy(asc(schema.usuarios.nome)),
  ]);
  const atribuiveis = papeisAtribuiveis(ator);
  const porUnidade = unidades
    .map((u) => ({ unidade: u, pessoas: pessoas.filter((p) => p.unidadeId === u.id) }))
    .filter((g) => g.pessoas.length > 0 || (admin && g.unidade.ativa));

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo={admin ? "Contas de acesso" : `Equipe — ${ator.unidade.nome}`}
        descricao="Cada profissional tem a própria conta: tudo o que é feito fica registrado em nome de quem fez. Ao sair alguém da equipe, desative a conta no mesmo dia."
      />

      <Expansivel rotulo="Nova conta">
        <FormNovoUsuario papeis={atribuiveis} unidades={admin ? unidades.filter((u) => u.ativa).map((u) => ({ id: u.id, nome: u.nome })) : undefined} />
      </Expansivel>

      {porUnidade.map(({ unidade, pessoas: lista }) => (
        <Cartao key={unidade.id}>
          <CabecalhoCartao
            titulo={
              <span className="flex items-center gap-2">
                <SeloUnidade unidade={unidade} /> {unidade.nome}
                {!unidade.ativa && <Selo>Inativa</Selo>}
              </span>
            }
            descricao={`${lista.filter((p) => p.ativo).length} conta(s) ativa(s)`}
          />
          <ul className="divide-y divide-zinc-100">
            {lista.map((p) => {
              const gerenciavel = p.id !== ator.id && atribuiveis.includes(p.papel);
              const bloqueada = p.bloqueadoAte && p.bloqueadoAte.getTime() > Date.now();
              return (
                <li key={p.id} className={cx("flex flex-wrap items-center gap-4 px-5 py-3.5", !p.ativo && "opacity-60")}>
                  <Avatar nome={p.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                      {p.nome}
                      {p.id === ator.id && <Selo tom="marca">Você</Selo>}
                      {!p.ativo && <Selo>Desativada</Selo>}
                      {bloqueada && <Selo tom="vermelho">Bloqueada por tentativas</Selo>}
                      {p.precisaTrocarSenha && p.ativo && <Selo tom="ambar">Aguardando 1º acesso</Selo>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {p.email} · {ROTULO_PAPEL[p.papel]}
                      {p.especialidade && ` · ${ROTULO_ESPECIALIDADE[p.especialidade]}`}
                      {p.registroProfissional && ` · ${p.registroProfissional}`}
                    </p>
                    <p className="text-xs text-zinc-400">Último acesso: {p.ultimoAcessoEm ? formatarDataHora(p.ultimoAcessoEm) : "nunca"}</p>
                  </div>
                  {gerenciavel && <AcoesUsuario id={p.id} ativo={p.ativo} nome={p.nome} />}
                </li>
              );
            })}
            {lista.length === 0 && <li className="px-5 py-4 text-sm text-zinc-500">Nenhuma conta nesta unidade ainda.</li>}
          </ul>
        </Cartao>
      ))}
    </div>
  );
}
