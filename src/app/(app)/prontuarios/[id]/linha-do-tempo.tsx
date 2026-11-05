import Link from "next/link";
import { ClipboardList, FilePlus2, Gavel, Lock, MessageSquareText, Send, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { ConteudoProntuario, InfoUnidade } from "@/lib/dados/prontuario";
import { ROTULO_RISCO, ROTULO_STATUS_MEDIDA, ROTULO_TIPO_ATENDIMENTO, ROTULO_VIOLENCIA } from "@/lib/rotulos";
import { ROTULO_ESPECIALIDADE } from "@/lib/rotulos";
import { formatarDataHora } from "@/lib/texto";
import { SeloUnidade, cx } from "@/components/ui";
import { SeloStatusEncaminhamento } from "@/components/selos";

type Evento = {
  chave: string;
  quando: Date;
  unidade: InfoUnidade;
  icone: ReactNode;
  tom: string;
  titulo: ReactNode;
  autor?: string;
  corpo?: ReactNode;
  restrito?: string;
  href: string;
};

export function LinhaDoTempo({
  conteudo,
  abertura,
  prontuarioId,
}: {
  conteudo: ConteudoProntuario;
  abertura: { quando: Date; unidade: InfoUnidade; autor: string };
  prontuarioId: string;
}) {
  const base = `/prontuarios/${prontuarioId}`;
  const eventos: Evento[] = [
    {
      chave: "abertura",
      quando: abertura.quando,
      unidade: abertura.unidade,
      icone: <FilePlus2 className="size-4" />,
      tom: "bg-zinc-100 text-zinc-600",
      titulo: "Prontuário aberto — primeiro acolhimento na rede",
      autor: abertura.autor,
      href: `${base}?aba=cadastro`,
    },
    ...conteudo.relatos.map<Evento>((r) => ({
      chave: `r-${r.id}`,
      quando: r.criadoEm,
      unidade: r.unidade,
      icone: <MessageSquareText className="size-4" />,
      tom: "bg-marca-100 text-marca-700",
      titulo: r.retificaId ? "Retificação de relato" : "Relato registrado",
      autor: r.autor.nome,
      corpo: r.visivel ? (
        <>
          {r.tiposViolencia.length > 0 && (
            <span className="mb-1 block text-xs text-zinc-500">{r.tiposViolencia.map((t) => ROTULO_VIOLENCIA[t as keyof typeof ROTULO_VIOLENCIA] ?? t).join(" · ")}</span>
          )}
          <span className="line-clamp-3">{r.texto}</span>
        </>
      ) : undefined,
      restrito: r.visivel ? undefined : restricao(r.sigilo, r.especialidade, r.unidade),
      href: `${base}?aba=relatos#relato-${r.id}`,
    })),
    ...conteudo.atendimentos.map<Evento>((a) => ({
      chave: `a-${a.id}`,
      quando: a.realizadoEm,
      unidade: a.unidade,
      icone: <ClipboardList className="size-4" />,
      tom: "bg-sky-100 text-sky-700",
      titulo: `${ROTULO_TIPO_ATENDIMENTO[a.tipo]}${a.retificaId ? " (retificação)" : ""}`,
      autor: a.profissional.nome,
      corpo: a.visivel ? <span className="line-clamp-2">{a.texto}</span> : undefined,
      restrito: a.visivel ? undefined : restricao(a.sigilo, a.especialidade, a.unidade),
      href: `${base}?aba=atendimentos#atendimento-${a.id}`,
    })),
    ...conteudo.avaliacoes.map<Evento>((v) => ({
      chave: `v-${v.id}`,
      quando: v.criadoEm,
      unidade: v.unidade,
      icone: <ShieldAlert className="size-4" />,
      tom: v.classificacao === "ELEVADO" ? "bg-rose-100 text-rose-700" : v.classificacao === "MEDIO" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700",
      titulo: `Avaliação de risco (FONAR): ${ROTULO_RISCO[v.classificacao].toLowerCase()}`,
      autor: v.profissional.nome,
      corpo: v.visivel ? `${v.fatoresGraves} fator(es) de risco grave identificados.` : undefined,
      href: `${base}?aba=risco`,
    })),
    ...conteudo.encaminhamentos.map<Evento>((e) => ({
      chave: `e-${e.id}`,
      quando: e.criadoEm,
      unidade: e.origem,
      icone: <Send className="size-4" />,
      tom: "bg-violet-100 text-violet-700",
      titulo: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          Encaminhada para {e.destino ? <SeloUnidade unidade={e.destino} /> : <strong>{e.destinoExterno}</strong>}
          <SeloStatusEncaminhamento status={e.status} />
        </span>
      ),
      autor: e.criadoPor.nome,
      corpo: e.motivo ? <span className="line-clamp-2">{e.motivo}</span> : undefined,
      href: `${base}?aba=encaminhamentos`,
    })),
    ...conteudo.medidas.map<Evento>((m) => ({
      chave: `m-${m.id}`,
      quando: m.criadoEm,
      unidade: m.unidade,
      icone: <Gavel className="size-4" />,
      tom: "bg-indigo-100 text-indigo-700",
      titulo: `Medida protetiva — ${ROTULO_STATUS_MEDIDA[m.status].toLowerCase()}`,
      autor: m.registradoPor.nome,
      corpo: m.medidas.join(" · "),
      href: `${base}?aba=medidas`,
    })),
  ].sort((a, b) => b.quando.getTime() - a.quando.getTime());

  return (
    <ol className="relative">
      {eventos.map((ev, i) => (
        <li key={ev.chave} className="relative flex gap-4 pb-6 last:pb-0">
          {i < eventos.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-px bg-zinc-200" />}
          <span className={cx("relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-white", ev.tom)}>{ev.icone}</span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              <SeloUnidade unidade={ev.unidade} />
              <time dateTime={ev.quando.toISOString()}>{formatarDataHora(ev.quando)}</time>
              {ev.autor && <span>· {ev.autor}</span>}
            </div>
            <Link href={ev.href} className="mt-1 block text-sm font-medium text-zinc-900 hover:text-marca-800">
              {ev.titulo}
            </Link>
            {ev.corpo && <p className="mt-1 text-sm leading-relaxed text-zinc-600">{ev.corpo}</p>}
            {ev.restrito && (
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200">
                <Lock className="size-3" /> {ev.restrito}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function restricao(sigilo: string, especialidade: string | null, unidade: InfoUnidade): string {
  if (sigilo === "ESPECIALIDADE" && especialidade) {
    return `Conteúdo restrito à ${ROTULO_ESPECIALIDADE[especialidade as keyof typeof ROTULO_ESPECIALIDADE] ?? especialidade}`;
  }
  if (sigilo === "UNIDADE") return `Conteúdo restrito à equipe da ${unidade.sigla}`;
  return "Conteúdo restrito à equipe técnica";
}
