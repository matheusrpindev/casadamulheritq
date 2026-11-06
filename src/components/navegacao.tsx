"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSearch,
  Home,
  Inbox,
  LogOut,
  Menu,
  ScrollText,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { sair } from "@/app/(app)/acoes-sessao";
import { FaixaCores, LogoMarca } from "./marca";
import { MARCAS, type Identidade } from "@/lib/identidade";
import { cx } from "./ui";

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  contador?: number;
};

const ICONES = {
  inicio: Home,
  busca: FileSearch,
  novo: UserPlus,
  encaminhamentos: Inbox,
  indicadores: BarChart3,
  auditoria: ScrollText,
  usuarios: Users,
  unidades: Building2,
};

export function Navegacao({
  grupos,
  usuario,
  nomeSistema,
  identidade,
}: {
  grupos: { titulo?: string; itens: ItemMenu[] }[];
  usuario: { nome: string; papel: string; unidade: string; cor: string };
  nomeSistema: string;
  identidade: Identidade;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`));

  const conteudo = (
    <div className="flex h-full flex-col">
      <FaixaCores identidade={identidade} />
      <Link href="/" className="block px-5 pt-6 pb-5" onClick={() => setAberto(false)} aria-label={`${nomeSistema} — início`}>
        <LogoMarca identidade={identidade} uso="menu" className={MARCAS[identidade].largura.menu} />
        <p className="mt-3 text-[11px] font-semibold tracking-wider text-marca-200 uppercase">
          {nomeSistema} · prontuário da rede
        </p>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Principal">
        {grupos.map((g, i) => (
          <div key={i}>
            {g.titulo && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-marca-300/80 uppercase">{g.titulo}</p>
            )}
            <ul className="space-y-0.5">
              {g.itens.map((item) => {
                const Icone = ICONES[item.icone];
                const marcado = ativo(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setAberto(false)}
                      aria-current={marcado ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        marcado ? "bg-white text-marca-800 shadow-sm" : "text-marca-100 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icone className="size-4.5 shrink-0" aria-hidden />
                      <span className="flex-1">{item.rotulo}</span>
                      {!!item.contador && (
                        <span
                          className={cx(
                            "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums",
                            marcado ? "bg-marca-600 text-white" : "bg-contador text-contador-texto",
                          )}
                        >
                          {item.contador}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/conta/senha"
          onClick={() => setAberto(false)}
          className="block rounded-lg px-3 py-2 hover:bg-white/10"
        >
          <p className="truncate text-sm font-medium text-white">{usuario.nome}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-marca-200">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: usuario.cor }} aria-hidden />
            {usuario.unidade} · {usuario.papel}
          </p>
        </Link>
        <form action={() => sair()}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-marca-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4.5" aria-hidden />
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="nao-imprimir sticky top-0 z-30 flex items-center justify-between bg-marca-950 px-4 py-3 text-white lg:hidden">
        <span className="flex items-center gap-2.5">
          <LogoMarca identidade={identidade} uso="menu" className="w-32" />
          <span className="border-l border-white/20 pl-2.5 text-xs font-semibold tracking-wider text-marca-200 uppercase">{nomeSistema}</span>
        </span>
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className="rounded-md p-1.5 hover:bg-white/10">
          <Menu className="size-5" />
        </button>
      </div>

      <aside className="nao-imprimir fixed inset-y-0 left-0 z-20 hidden w-64 bg-marca-950 lg:block">{conteudo}</aside>

      {aberto && (
        <div className="nao-imprimir fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-900/50" onClick={() => setAberto(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-marca-950 shadow-xl">
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="absolute top-5 right-3 rounded-md p-1.5 text-white hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            {conteudo}
          </aside>
        </div>
      )}
    </>
  );
}
