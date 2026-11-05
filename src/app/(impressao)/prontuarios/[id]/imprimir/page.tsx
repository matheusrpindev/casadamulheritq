import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/sessao";
import { registrarAuditoria } from "@/lib/auditoria";
import { cadastroDecifrado, carregarConteudo, carregarProntuario, mapasRede } from "@/lib/dados/prontuario";
import { avaliarFonar } from "@/lib/fonar";
import { NOME_REDE, NOME_SISTEMA, PREFIXO_PRONTUARIO } from "@/lib/config";
import {
  ROTULO_RISCO,
  ROTULO_STATUS_ENCAMINHAMENTO,
  ROTULO_STATUS_MEDIDA,
  ROTULO_TIPO_ATENDIMENTO,
  ROTULO_VINCULO,
  ROTULO_VIOLENCIA,
} from "@/lib/rotulos";
import { formatarData, formatarDataHora, idade, mascararCpf, nomeExibicao, numeroProntuario } from "@/lib/texto";
import { BotaoImprimir } from "./botao";

export const metadata: Metadata = { title: "Impressão do prontuário" };

export default async function PaginaImpressao({ params }: PageProps<"/prontuarios/[id]/imprimir">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const carga = await carregarProntuario(usuario, id);
  if (carga.situacao === "nao-encontrado") notFound();
  if (carga.situacao === "sem-acesso") redirect(`/prontuarios/${id}`);

  const p = carga.prontuario;
  const mapas = await mapasRede();
  const c = await carregarConteudo(usuario, id, mapas);
  const cad = cadastroDecifrado(p);
  await registrarAuditoria("PRONTUARIO_IMPRESSO", { usuarioId: usuario.id, unidadeId: usuario.unidadeId }, { prontuarioId: id });

  const anos = idade(p.dataNascimento);
  const relatos = c.relatos.filter((r) => r.visivel && !r.retificadoPor);
  const atendimentos = c.atendimentos.filter((a) => a.visivel && !a.retificadoPor);
  const ultima = c.avaliacoes[0];
  const fonar = ultima?.respostas ? avaliarFonar(ultima.respostas) : null;

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-[13px] leading-relaxed text-slate-900 print:max-w-none print:p-0">
      <div className="nao-imprimir mb-6 flex items-center justify-between rounded-xl bg-lilas-50 px-4 py-3 text-sm text-lilas-900">
        <span>Esta impressão fica registrada na trilha de auditoria. Guarde o papel em local seguro ou descarte triturando.</span>
        <BotaoImprimir />
      </div>

      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase">Documento sigiloso</p>
          <h1 className="text-xl font-bold">Prontuário único — Rede de Atendimento à Mulher</h1>
          <p className="text-xs text-slate-600">
            {NOME_SISTEMA} · {NOME_REDE}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-semibold">{numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)}</p>
          <p>Emitido em {formatarDataHora(new Date())}</p>
          <p>
            por {usuario.nome} ({usuario.unidade.sigla})
          </p>
        </div>
      </header>

      <Secao titulo="Identificação">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <Linha r="Nome">{nomeExibicao(p)}</Linha>
          {p.nomeSocial && <Linha r="Registro civil">{p.nomeCivil}</Linha>}
          <Linha r="Nascimento">
            {formatarData(p.dataNascimento)}
            {anos !== null && ` (${anos} anos)`}
          </Linha>
          <Linha r="CPF">{cad.cpf ? mascararCpf(cad.cpf) : "—"}</Linha>
          <Linha r="Raça/cor">{p.racaCor ?? "—"}</Linha>
          <Linha r="Identidade de gênero">{p.identidadeGenero ?? "—"}</Linha>
          <Linha r="Contato">
            {p.contatoSeguro ? "Pode ligar" : "NÃO É SEGURO LIGAR"} {p.melhorHorario && `· ${p.melhorHorario}`}
          </Linha>
          <Linha r="Unidade de origem">{mapas.unidade(p.unidadeOrigemId).nome}</Linha>
          <Linha r="Compartilhamento">{p.compartilhamentoAutorizado ? "Autorizado pela mulher" : "Não autorizado"}</Linha>
          <Linha r="Risco atual">{ROTULO_RISCO[p.nivelRisco]}</Linha>
        </div>
      </Secao>

      {c.autores.length > 0 && (
        <Secao titulo="Autor(es) da violência">
          {c.autores.map((a) => (
            <p key={a.id}>
              <strong>{a.nome}</strong> — {ROTULO_VINCULO[a.vinculo]}
              {a.acessoArma === "SIM" && " — TEM ACESSO A ARMA DE FOGO"}
            </p>
          ))}
        </Secao>
      )}

      {ultima && (
        <Secao titulo="Avaliação de risco (FONAR) mais recente">
          <p>
            <strong>{ROTULO_RISCO[ultima.classificacao]}</strong> — {formatarData(ultima.criadoEm)}, {ultima.unidade.sigla}, {ultima.profissional.nome}
          </p>
          {fonar && fonar.fatoresGraves.length > 0 && <p>Fatores graves: {fonar.fatoresGraves.join("; ")}.</p>}
          {ultima.justificativa && <p className="mt-1 whitespace-pre-wrap">{ultima.justificativa}</p>}
        </Secao>
      )}

      {c.medidas.length > 0 && (
        <Secao titulo="Medidas protetivas">
          {c.medidas.map((m) => (
            <p key={m.id}>
              {ROTULO_STATUS_MEDIDA[m.status]}
              {m.validaAte && ` até ${formatarData(m.validaAte)}`}: {m.medidas.join("; ")}
              {m.numeroProcesso && ` (proc. ${m.numeroProcesso})`}
            </p>
          ))}
        </Secao>
      )}

      {relatos.length > 0 && (
        <Secao titulo="Relatos">
          {relatos.map((r) => (
            <article key={r.id} className="mb-3 break-inside-avoid">
              <p className="text-xs text-slate-600">
                {formatarDataHora(r.criadoEm)} · {r.unidade.sigla} · {r.autor.nome}
                {r.tiposViolencia.length > 0 &&
                  ` · ${r.tiposViolencia.map((t) => ROTULO_VIOLENCIA[t as keyof typeof ROTULO_VIOLENCIA] ?? t).join(", ")}`}
              </p>
              <p className="whitespace-pre-wrap">{r.texto}</p>
            </article>
          ))}
        </Secao>
      )}

      {atendimentos.length > 0 && (
        <Secao titulo="Atendimentos">
          {atendimentos.map((a) => (
            <article key={a.id} className="mb-3 break-inside-avoid">
              <p className="text-xs text-slate-600">
                {formatarDataHora(a.realizadoEm)} · {a.unidade.sigla} · {ROTULO_TIPO_ATENDIMENTO[a.tipo]} · {a.profissional.nome}
              </p>
              <p className="whitespace-pre-wrap">{a.texto}</p>
            </article>
          ))}
        </Secao>
      )}

      {c.encaminhamentos.length > 0 && (
        <Secao titulo="Encaminhamentos">
          {c.encaminhamentos.map((e) => (
            <p key={e.id}>
              {formatarData(e.criadoEm)}: {e.origem.sigla} → {e.destino?.nome ?? e.destinoExterno} ({ROTULO_STATUS_ENCAMINHAMENTO[e.status]})
            </p>
          ))}
        </Secao>
      )}

      <footer className="mt-8 border-t border-slate-300 pt-3 text-[11px] text-slate-600">
        Informações sigilosas sobre mulher em situação de violência (Lei 11.340/2006 e Lei 13.709/2018 — LGPD). Uso restrito
        ao atendimento pela rede de proteção. Registros com acesso restrito por especialidade ou unidade não aparecem nesta
        impressão.
      </footer>
    </main>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 border-b border-slate-300 pb-0.5 text-sm font-bold tracking-wide uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

function Linha({ r, children }: { r: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="text-slate-600">{r}:</span> {children}
    </p>
  );
}
