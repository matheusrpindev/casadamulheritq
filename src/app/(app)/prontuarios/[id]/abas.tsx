import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import {
  BookOpenText,
  ClipboardList,
  Gavel,
  HeartHandshake,
  Home,
  Lock,
  MessageSquareText,
  Phone,
  Send,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { db, schema } from "@/db";
import type { Prontuario } from "@/db/schema";
import { avaliarFonar, FONAR } from "@/lib/fonar";
import {
  acessosAoProntuario,
  cadastroDecifrado,
  type ConteudoProntuario,
  type mapasRede,
} from "@/lib/dados/prontuario";
import {
  concessaoVigente,
  podeAlterarConsentimento,
  podeCadastrar,
  podeRevisarAcessoEmergencial,
  sigilosPermitidos,
  type Concessao,
} from "@/lib/permissoes";
import {
  ROTULO_ACAO,
  ROTULO_ESPECIALIDADE,
  ROTULO_ORIGEM_ACESSO,
  ROTULO_RISCO,
  ROTULO_SIGILO,
  ROTULO_STATUS_MEDIDA,
  ROTULO_TIPO_ATENDIMENTO,
  ROTULO_VINCULO,
  ROTULO_VIOLENCIA,
} from "@/lib/rotulos";
import type { UsuarioLogado } from "@/lib/sessao";
import { formatarCpf, formatarData, formatarDataHora, hojeISO } from "@/lib/texto";
import { Aviso, BotaoLink, CabecalhoCartao, Cartao, DadoRotulado, Selo, SeloUnidade, Vazio, cx } from "@/components/ui";
import { SeloRisco, SeloStatusEncaminhamento, SeloUrgencia } from "@/components/selos";
import { LinhaDoTempo, restricao } from "./linha-do-tempo";
import {
  AcoesEncaminhamento,
  Expansivel,
  FormAtendimento,
  FormAtualizarMedida,
  FormAutor,
  FormCadastro,
  FormConsentimento,
  FormEncaminhamento,
  FormMedida,
  FormRelato,
  FormRetificacao,
  FormRevisarAcesso,
  FormStatus,
} from "./formularios";

type Ctx = {
  usuario: UsuarioLogado;
  prontuario: Prontuario;
  conteudo: ConteudoProntuario;
  mapas: Awaited<ReturnType<typeof mapasRede>>;
  concessoes: (typeof schema.acessos.$inferSelect)[];
  tecnica: boolean;
  medidasVigentes: ConteudoProntuario["medidas"];
};

const especialidadeRotulo = (e: string | null) =>
  e ? ROTULO_ESPECIALIDADE[e as keyof typeof ROTULO_ESPECIALIDADE] ?? e : null;

function AvisoSoTecnica() {
  return (
    <Cartao>
      <Vazio titulo="Conteúdo restrito à equipe técnica" icone={<Lock className="size-10" />}>
        Relatos, atendimentos e avaliações são lidos somente por profissionais da equipe técnica.
      </Vazio>
    </Cartao>
  );
}

function SeloSigilo({ sigilo, especialidade }: { sigilo: string; especialidade: string | null }) {
  if (sigilo === "REDE") return null;
  return (
    <Selo tom="ambar">
      <Lock className="size-3" />
      {sigilo === "ESPECIALIDADE" ? `Só ${especialidadeRotulo(especialidade)}` : ROTULO_SIGILO.UNIDADE}
    </Selo>
  );
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export function AbaResumo({ usuario, prontuario: p, conteudo, mapas, tecnica, medidasVigentes }: Ctx) {
  const relatosVigentes = conteudo.relatos.filter((r) => r.visivel && !r.retificadoPor);
  const ultimaAvaliacao = conteudo.avaliacoes[0];
  const fonar = ultimaAvaliacao?.respostas ? avaliarFonar(ultimaAvaliacao.respostas) : null;
  const abertos = conteudo.encaminhamentos.filter((e) => e.status === "ENVIADO" || e.status === "RECEBIDO");
  const contato = cadastroDecifrado(p);
  const unidadesQueAtenderam = new Set([...conteudo.atendimentos.map((a) => a.unidade.sigla), ...conteudo.relatos.map((r) => r.unidade.sigla)]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Cartao className="border-lilas-200">
          <CabecalhoCartao
            icone={<BookOpenText className="size-5" />}
            titulo="Antes de atender, leia"
            descricao={
              unidadesQueAtenderam.size > 1
                ? `Ela já foi atendida por ${unidadesQueAtenderam.size} unidades da rede. O que já foi contado está aqui — não peça que ela repita.`
                : "O que ela já contou está aqui — não peça que ela repita."
            }
          />
          <div className="p-5">
            {!tecnica ? (
              <p className="text-sm text-slate-500">O conteúdo dos relatos é visível apenas para a equipe técnica.</p>
            ) : relatosVigentes.length === 0 ? (
              <div className="text-sm text-slate-500">
                Nenhum relato registrado ainda.{" "}
                <Link href={`/prontuarios/${p.id}?aba=relatos`} className="font-medium text-lilas-700 underline">
                  Registrar relato
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {relatosVigentes.slice(0, 2).map((r, i) => (
                  <article key={r.id} className={cx(i > 0 && "border-t border-slate-100 pt-5")}>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <SeloUnidade unidade={r.unidade} />
                      <span>{formatarDataHora(r.criadoEm)}</span>
                      <span>· {r.autor.nome}</span>
                      {r.dataFato && <span>· fato em {formatarData(r.dataFato)}</span>}
                      <SeloSigilo sigilo={r.sigilo} especialidade={r.especialidade} />
                    </div>
                    {r.tiposViolencia.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {r.tiposViolencia.map((t) => (
                          <Selo key={t} tom="lilas">
                            Violência {ROTULO_VIOLENCIA[t as keyof typeof ROTULO_VIOLENCIA]?.toLowerCase() ?? t}
                          </Selo>
                        ))}
                      </div>
                    )}
                    <p className="texto-relato line-clamp-[12]">{r.texto}</p>
                  </article>
                ))}
                {relatosVigentes.length > 2 && (
                  <Link href={`/prontuarios/${p.id}?aba=relatos`} className="text-sm font-medium text-lilas-700 hover:underline">
                    Ver todos os {relatosVigentes.length} relatos →
                  </Link>
                )}
              </div>
            )}
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Linha do tempo na rede" descricao="Tudo o que cada unidade registrou, em ordem." />
          <div className="p-5">
            <LinhaDoTempo
              conteudo={conteudo}
              prontuarioId={p.id}
              abertura={{ quando: p.criadoEm, unidade: mapas.unidade(p.unidadeOrigemId), autor: mapas.pessoa(p.criadoPorId).nome }}
            />
          </div>
        </Cartao>
      </div>

      <div className="space-y-6">
        <Cartao>
          <CabecalhoCartao icone={<ShieldAlert className="size-5" />} titulo="Avaliação de risco" />
          <div className="p-5">
            {!ultimaAvaliacao ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Nenhuma avaliação de risco aplicada ainda.</p>
                {tecnica && (
                  <BotaoLink href={`/prontuarios/${p.id}/risco/novo`} tamanho="sm">
                    Aplicar FONAR
                  </BotaoLink>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <SeloRisco nivel={ultimaAvaliacao.classificacao} grande />
                <p className="text-xs text-slate-500">
                  {formatarData(ultimaAvaliacao.criadoEm)} · {ultimaAvaliacao.unidade.sigla} · {ultimaAvaliacao.profissional.nome}
                </p>
                {fonar && fonar.fatoresGraves.length > 0 && (
                  <ul className="space-y-1">
                    {fonar.fatoresGraves.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-rose-900">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                {fonar?.aceitaAbrigamento && (
                  <Aviso tom="atencao" icone={<Home className="size-4" />}>
                    Ela disse que <strong>aceita abrigamento temporário</strong>.
                  </Aviso>
                )}
                <Link href={`/prontuarios/${p.id}?aba=risco`} className="block text-sm font-medium text-lilas-700 hover:underline">
                  Ver avaliação completa →
                </Link>
              </div>
            )}
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao icone={<Phone className="size-5" />} titulo="Como falar com ela" />
          <div className="space-y-2 p-5 text-sm">
            {!p.contatoSeguro && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 font-medium text-rose-900">Ligar pode colocá-la em risco.</p>
            )}
            <p>
              <span className="text-slate-500">Telefone:</span> {contato.telefone ?? "não informado"}
            </p>
            <p>
              <span className="text-slate-500">Recado:</span> {p.podeDeixarRecado ? "pode deixar" : "não deixar recado"}
            </p>
            {p.melhorHorario && (
              <p>
                <span className="text-slate-500">Horário:</span> {p.melhorHorario}
              </p>
            )}
            {contato.orientacoesContato && <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{contato.orientacoesContato}</p>}
          </div>
        </Cartao>

        {medidasVigentes.length > 0 && (
          <Cartao>
            <CabecalhoCartao icone={<Gavel className="size-5" />} titulo="Medidas protetivas vigentes" />
            <ul className="divide-y divide-slate-100">
              {medidasVigentes.map((m) => (
                <li key={m.id} className="px-5 py-3 text-sm">
                  <p className="text-slate-800">{m.medidas.join(" · ")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {m.validaAte ? `Válida até ${formatarData(m.validaAte)}` : "Sem data de validade registrada"}
                  </p>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        {conteudo.autores.length > 0 && (
          <Cartao>
            <CabecalhoCartao icone={<UserX className="size-5" />} titulo="Autor da violência" />
            <ul className="divide-y divide-slate-100">
              {conteudo.autores.map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-slate-900">{a.nome}</p>
                  <p className="text-xs text-slate-500">
                    {ROTULO_VINCULO[a.vinculo]}
                    {a.acessoArma === "SIM" && <strong className="ml-1 text-rose-700">· acesso a arma de fogo</strong>}
                  </p>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        {abertos.length > 0 && (
          <Cartao>
            <CabecalhoCartao icone={<Send className="size-5" />} titulo="Encaminhamentos em aberto" />
            <ul className="divide-y divide-slate-100">
              {abertos.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    → {e.destino ? <SeloUnidade unidade={e.destino} /> : e.destinoExterno}
                  </span>
                  <SeloStatusEncaminhamento status={e.status} />
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        {usuario.papel === "RECEPCAO" && (
          <Aviso tom="info" icone={<HeartHandshake className="size-4" />}>
            Ao recebê-la, confirme a chegada na aba Encaminhamentos. A equipe técnica será avisada.
          </Aviso>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatos
// ---------------------------------------------------------------------------

export function AbaRelatos({ usuario, prontuario: p, conteudo, tecnica }: Ctx) {
  if (!tecnica) return <AvisoSoTecnica />;
  return (
    <div className="space-y-6">
      <Expansivel rotulo="Registrar relato ou complemento" abertoInicial={conteudo.relatos.length === 0}>
        <FormRelato prontuarioId={p.id} sigilos={sigilosPermitidos(usuario)} especialidade={especialidadeRotulo(usuario.especialidade)} />
      </Expansivel>

      {conteudo.relatos.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhum relato registrado" icone={<MessageSquareText className="size-10" />} />
        </Cartao>
      ) : (
        conteudo.relatos.map((r) => (
          <Cartao key={r.id} id={`relato-${r.id}`} className={cx("scroll-mt-6", r.retificadoPor && "opacity-70")}>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
              <SeloUnidade unidade={r.unidade} />
              <span className="font-medium text-slate-700">{r.autor.nome}</span>
              {r.especialidade && <span>· {especialidadeRotulo(r.especialidade)}</span>}
              <span>· registrado em {formatarDataHora(r.criadoEm)}</span>
              {r.dataFato && <span>· fato em {formatarData(r.dataFato)}</span>}
              <SeloSigilo sigilo={r.sigilo} especialidade={r.especialidade} />
              {r.retificadoPor && <Selo tom="neutro">Retificado em {formatarData(r.retificadoPor.criadoEm)}</Selo>}
              {r.retificaId && <Selo tom="azul">Retificação</Selo>}
            </div>
            <div className="p-5">
              {!r.visivel ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="size-4" /> {restricao(r.sigilo, r.especialidade, r.unidade)}.
                </p>
              ) : (
                <>
                  {r.tiposViolencia.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {r.tiposViolencia.map((t) => (
                        <Selo key={t} tom="lilas">
                          {ROTULO_VIOLENCIA[t as keyof typeof ROTULO_VIOLENCIA] ?? t}
                        </Selo>
                      ))}
                    </div>
                  )}
                  {r.localFato && <p className="mb-2 text-xs text-slate-500">Local: {r.localFato}</p>}
                  {r.motivoRetificacao && (
                    <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Motivo da retificação: {r.motivoRetificacao}</p>
                  )}
                  <p className={cx("texto-relato", r.retificadoPor && "line-through decoration-slate-300")}>{r.texto}</p>
                  {r.autor.id === usuario.id && !r.retificadoPor && r.texto && (
                    <div className="mt-3">
                      <FormRetificacao tipo="relato" id={r.id} textoAtual={r.texto} />
                    </div>
                  )}
                </>
              )}
            </div>
          </Cartao>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Atendimentos
// ---------------------------------------------------------------------------

function agoraLocal() {
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  return partes.replace(" ", "T");
}

export function AbaAtendimentos({ usuario, prontuario: p, conteudo, tecnica }: Ctx) {
  if (!tecnica) {
    return (
      <Cartao>
        <CabecalhoCartao titulo="Atendimentos" descricao="O conteúdo é restrito à equipe técnica." />
        <ul className="divide-y divide-slate-100">
          {conteudo.atendimentos.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-5 py-3 text-sm">
              <SeloUnidade unidade={a.unidade} />
              <span>{ROTULO_TIPO_ATENDIMENTO[a.tipo]}</span>
              <span className="text-slate-500">· {formatarDataHora(a.realizadoEm)}</span>
            </li>
          ))}
        </ul>
      </Cartao>
    );
  }
  return (
    <div className="space-y-6">
      <Expansivel rotulo="Registrar atendimento">
        <FormAtendimento
          prontuarioId={p.id}
          sigilos={sigilosPermitidos(usuario)}
          especialidade={especialidadeRotulo(usuario.especialidade)}
          agora={agoraLocal()}
        />
      </Expansivel>

      {conteudo.atendimentos.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhum atendimento registrado" icone={<ClipboardList className="size-10" />} />
        </Cartao>
      ) : (
        <Cartao>
          <ul className="divide-y divide-slate-100">
            {conteudo.atendimentos.map((a) => (
              <li key={a.id} id={`atendimento-${a.id}`} className={cx("scroll-mt-6 px-5 py-4", a.retificadoPor && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <SeloUnidade unidade={a.unidade} />
                  <span className="font-medium text-slate-800">{ROTULO_TIPO_ATENDIMENTO[a.tipo]}</span>
                  <span>· {formatarDataHora(a.realizadoEm)}</span>
                  <span>
                    · {a.profissional.nome}
                    {a.especialidade && ` (${especialidadeRotulo(a.especialidade)})`}
                  </span>
                  <SeloSigilo sigilo={a.sigilo} especialidade={a.especialidade} />
                  {a.retificadoPor && <Selo>Retificado</Selo>}
                  {a.retificaId && <Selo tom="azul">Retificação</Selo>}
                </div>
                {a.visivel ? (
                  <>
                    {a.motivoRetificacao && (
                      <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Motivo da retificação: {a.motivoRetificacao}</p>
                    )}
                    <p className={cx("mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700", a.retificadoPor && "line-through decoration-slate-300")}>
                      {a.texto}
                    </p>
                    {a.profissional.id === usuario.id && !a.retificadoPor && a.texto && (
                      <div className="mt-2">
                        <FormRetificacao tipo="atendimento" id={a.id} textoAtual={a.texto} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Lock className="size-4" /> {restricao(a.sigilo, a.especialidade, a.unidade)}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risco
// ---------------------------------------------------------------------------

export function AbaRisco({ prontuario: p, conteudo, tecnica }: Ctx) {
  return (
    <div className="space-y-6">
      <Cartao className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-slate-900">Formulário Nacional de Avaliação de Risco (FONAR)</p>
            <p className="mt-1 text-sm text-slate-600">
              Lei 14.149/2021. Se ela já respondeu em outra unidade, a resposta está abaixo — reaplique só se a situação
              mudou (nova agressão, separação, ameaça).
            </p>
          </div>
          {tecnica && p.status === "ATIVO" && (
            <BotaoLink href={`/prontuarios/${p.id}/risco/novo`}>
              <ShieldAlert className="size-4" /> {conteudo.avaliacoes.length ? "Reaplicar avaliação" : "Aplicar avaliação"}
            </BotaoLink>
          )}
        </div>
      </Cartao>

      {conteudo.avaliacoes.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhuma avaliação aplicada" icone={<ShieldAlert className="size-10" />} />
        </Cartao>
      ) : (
        conteudo.avaliacoes.map((v, i) => {
          const r = v.respostas ? avaliarFonar(v.respostas) : null;
          return (
            <Cartao key={v.id}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
                <SeloRisco nivel={v.classificacao} grande />
                {i === 0 && <Selo tom="lilas">Mais recente</Selo>}
                <span className="text-xs text-slate-500">
                  <SeloUnidade unidade={v.unidade} /> {formatarDataHora(v.criadoEm)} · {v.profissional.nome}
                </span>
                {v.sugestao !== v.classificacao && (
                  <span className="text-xs text-slate-500">(sugestão automática: {ROTULO_RISCO[v.sugestao].toLowerCase()})</span>
                )}
              </div>
              {!v.visivel || !r || !v.respostas ? (
                <p className="px-5 py-4 text-sm text-slate-500">Respostas visíveis apenas para a equipe técnica.</p>
              ) : (
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold tracking-wide text-rose-800 uppercase">Fatores de risco grave ({r.fatoresGraves.length})</p>
                      {r.fatoresGraves.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum.</p>
                      ) : (
                        <ul className="space-y-1 text-sm text-slate-800">
                          {r.fatoresGraves.map((f) => (
                            <li key={f} className="flex gap-2">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold tracking-wide text-amber-800 uppercase">Fatores de atenção ({r.fatoresAtencao.length})</p>
                      {r.fatoresAtencao.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum.</p>
                      ) : (
                        <ul className="space-y-1 text-sm text-slate-800">
                          {r.fatoresAtencao.map((f) => (
                            <li key={f} className="flex gap-2">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {v.justificativa && (
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                      <p className="text-xs font-semibold text-slate-600">Parte II — avaliação da profissional</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-800">{v.justificativa}</p>
                    </div>
                  )}
                  <details className="group rounded-lg border border-slate-200">
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-lilas-800">Ver todas as respostas</summary>
                    <div className="space-y-5 border-t border-slate-100 px-4 py-4">
                      {FONAR.map((bloco) => (
                        <div key={bloco.titulo}>
                          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">{bloco.titulo}</p>
                          <dl className="space-y-2">
                            {bloco.perguntas.map((q) => {
                              const marcadas = v.respostas?.[q.id] ?? [];
                              const graves = marcadas.some((m) => q.opcoes.find((o) => o.valor === m)?.peso === "grave");
                              return (
                                <div key={q.id} className="grid gap-1 text-sm sm:grid-cols-[1fr_240px]">
                                  <dt className="text-slate-600">
                                    {q.numero}. {q.texto}
                                  </dt>
                                  <dd className={cx("font-medium", graves ? "text-rose-800" : "text-slate-900")}>
                                    {marcadas.length
                                      ? marcadas.map((m) => q.opcoes.find((o) => o.valor === m)?.rotulo ?? m).join("; ")
                                      : <span className="font-normal text-slate-400">Sem resposta</span>}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </Cartao>
          );
        })
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encaminhamentos
// ---------------------------------------------------------------------------

export async function AbaEncaminhamentos({ usuario, prontuario: p, conteudo, tecnica }: Ctx) {
  const unidades = await db
    .select({ id: schema.unidades.id, nome: schema.unidades.nome })
    .from(schema.unidades)
    .where(and(eq(schema.unidades.ativa, true), ne(schema.unidades.id, usuario.unidadeId)))
    .orderBy(schema.unidades.nome);

  return (
    <div className="space-y-6">
      {tecnica && p.status === "ATIVO" && (
        <Expansivel id="novo" rotulo="Encaminhar para outra unidade">
          <FormEncaminhamento prontuarioId={p.id} unidades={unidades} compartilhamentoAutorizado={p.compartilhamentoAutorizado} />
        </Expansivel>
      )}

      {conteudo.encaminhamentos.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhum encaminhamento" icone={<Send className="size-10" />}>
            Encaminhe pelo sistema para que a próxima unidade receba o histórico e ela não precise recontar.
          </Vazio>
        </Cartao>
      ) : (
        <Cartao>
          <ul className="divide-y divide-slate-100">
            {conteudo.encaminhamentos.map((e) => {
              const ehDestino = e.destinoUnidadeId === usuario.unidadeId;
              const ehOrigem = e.origem.id === usuario.unidadeId;
              const aberto = e.status === "ENVIADO" || e.status === "RECEBIDO";
              return (
                <li key={e.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <SeloUnidade unidade={e.origem} />
                    <span className="text-slate-400">→</span>
                    {e.destino ? <SeloUnidade unidade={e.destino} /> : <span className="font-medium">{e.destinoExterno}</span>}
                    <SeloStatusEncaminhamento status={e.status} />
                    <SeloUrgencia urgencia={e.urgencia} />
                    <span className="text-xs text-slate-500">
                      {formatarDataHora(e.criadoEm)} · por {e.criadoPor.nome}
                    </span>
                  </div>
                  {e.motivo && (
                    <div className="mt-3 rounded-lg bg-lilas-50/60 px-4 py-3">
                      <p className="text-xs font-semibold text-lilas-900">Ficha de passagem</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">{e.motivo}</p>
                    </div>
                  )}
                  {e.recebidoEm && (
                    <p className="mt-2 text-xs text-slate-500">
                      Recebida em {formatarDataHora(e.recebidoEm)}
                      {e.recebidoPor && ` por ${e.recebidoPor.nome}`}
                    </p>
                  )}
                  {e.resposta && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                      <p className="text-xs font-semibold text-slate-600">Devolutiva</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-800">{e.resposta}</p>
                    </div>
                  )}
                  {aberto && (
                    <AcoesEncaminhamento
                      id={e.id}
                      podeReceber={ehDestino && e.status === "ENVIADO"}
                      podeConcluir={ehDestino && tecnica}
                      podeRecusar={ehDestino && tecnica && e.status === "ENVIADO"}
                      podeCancelar={ehOrigem && tecnica}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Medidas protetivas
// ---------------------------------------------------------------------------

export function AbaMedidas({ prontuario: p, conteudo, tecnica }: Ctx) {
  const hoje = hojeISO();
  return (
    <div className="space-y-6">
      {tecnica && (
        <Expansivel rotulo="Registrar medida protetiva">
          <FormMedida prontuarioId={p.id} />
        </Expansivel>
      )}
      {conteudo.medidas.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhuma medida protetiva registrada" icone={<Gavel className="size-10" />} />
        </Cartao>
      ) : (
        <Cartao>
          <ul className="divide-y divide-slate-100">
            {conteudo.medidas.map((m) => {
              const vencida = m.status === "DEFERIDA" && m.validaAte && m.validaAte < hoje;
              return (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Selo tom={m.status === "DEFERIDA" && !vencida ? "lilas" : m.status === "SOLICITADA" ? "ambar" : "neutro"}>
                      {vencida ? "Vencida" : ROTULO_STATUS_MEDIDA[m.status]}
                    </Selo>
                    {m.validaAte && <span className="text-sm text-slate-700">válida até {formatarData(m.validaAte)}</span>}
                    {m.numeroProcesso && <span className="font-mono text-xs text-slate-500">proc. {m.numeroProcesso}</span>}
                  </div>
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-800">
                    {m.medidas.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  {m.observacoes && <p className="mt-2 text-sm text-slate-600">{m.observacoes}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    Registrada por {m.registradoPor.nome} ({m.unidade.sigla}) em {formatarData(m.criadoEm)}
                    {m.solicitadaEm && ` · solicitada em ${formatarData(m.solicitadaEm)}`}
                    {m.decididaEm && ` · decidida em ${formatarData(m.decididaEm)}`}
                  </p>
                  {tecnica && (
                    <div className="mt-2">
                      <FormAtualizarMedida id={m.id} status={m.status} validaAte={m.validaAte} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Autor da violência
// ---------------------------------------------------------------------------

export function AbaAutores({ prontuario: p, conteudo, tecnica }: Ctx) {
  return (
    <div className="space-y-6">
      {tecnica && (
        <Expansivel rotulo="Registrar autor da violência">
          <FormAutor prontuarioId={p.id} />
        </Expansivel>
      )}
      {conteudo.autores.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhum autor registrado" icone={<UserX className="size-10" />} />
        </Cartao>
      ) : (
        <Cartao>
          <ul className="divide-y divide-slate-100">
            {conteudo.autores.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{a.nome}</p>
                  <Selo>{ROTULO_VINCULO[a.vinculo]}</Selo>
                  {a.acessoArma === "SIM" && <Selo tom="vermelho">Acesso a arma de fogo</Selo>}
                  {a.acessoArma === "NAO_SABE" && <Selo>Acesso a arma: não sabe</Selo>}
                </div>
                {a.observacoes && <p className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{a.observacoes}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Registrado pela {a.unidade.sigla} em {formatarData(a.criadoEm)}
                </p>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cadastro e autorização
// ---------------------------------------------------------------------------

export function AbaCadastro({ usuario, prontuario: p, mapas, concessoes }: Ctx) {
  const c = cadastroDecifrado(p);
  const unidadesComAcesso = concessoes.filter((x) => concessaoVigente(x as Concessao));
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Cartao className="p-5 sm:p-6 lg:col-span-2">
        {podeCadastrar(usuario) ? (
          <FormCadastro
            prontuarioId={p.id}
            valores={{
              nomeCivil: p.nomeCivil,
              nomeSocial: p.nomeSocial,
              dataNascimento: p.dataNascimento,
              cpf: c.cpf ? formatarCpf(c.cpf) : null,
              identidadeGenero: p.identidadeGenero,
              racaCor: p.racaCor,
              escolaridade: p.escolaridade,
              ocupacao: p.ocupacao,
              telefone: c.telefone,
              contatoSeguro: p.contatoSeguro,
              podeDeixarRecado: p.podeDeixarRecado,
              melhorHorario: p.melhorHorario,
              orientacoesContato: c.orientacoesContato,
              endereco: c.endereco,
              bairro: p.bairro,
            }}
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <DadoRotulado rotulo="Nome civil">{p.nomeCivil}</DadoRotulado>
            <DadoRotulado rotulo="Nome social">{p.nomeSocial}</DadoRotulado>
            <DadoRotulado rotulo="Nascimento">{formatarData(p.dataNascimento)}</DadoRotulado>
            <DadoRotulado rotulo="Bairro">{p.bairro}</DadoRotulado>
          </dl>
        )}
      </Cartao>

      <div className="space-y-6">
        <Cartao>
          <CabecalhoCartao titulo="Autorização de compartilhamento" />
          <div className="space-y-3 p-5 text-sm">
            <p className={p.compartilhamentoAutorizado ? "text-emerald-800" : "text-amber-900"}>
              {p.compartilhamentoAutorizado
                ? "Ela autorizou que as unidades da rede que a atenderem leiam este prontuário."
                : "Ela não autorizou o compartilhamento com a rede. Só unidades com autorização específica ou acesso emergencial veem o conteúdo."}
            </p>
            {p.consentimentoRegistradoEm && (
              <p className="text-xs text-slate-500">
                Registrado em {formatarDataHora(p.consentimentoRegistradoEm)} por {mapas.pessoa(p.consentimentoRegistradoPorId).nome}
              </p>
            )}
            {podeAlterarConsentimento(usuario) && <FormConsentimento prontuarioId={p.id} autorizado={p.compartilhamentoAutorizado} />}
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Unidades com acesso agora" />
          <ul className="divide-y divide-slate-100">
            {unidadesComAcesso.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                <SeloUnidade unidade={mapas.unidade(x.unidadeId)} />
                <span className={cx("text-xs", x.origem === "EMERGENCIAL" ? "font-medium text-rose-700" : "text-slate-500")}>
                  {ROTULO_ORIGEM_ACESSO[x.origem]}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>

        {usuario.papel === "GESTORA" && (
          <Cartao className="p-5">
            <p className="mb-3 text-sm text-slate-600">
              Arquivar quando o acompanhamento terminar. Nada é apagado: o prontuário pode ser reativado se ela voltar.
            </p>
            <FormStatus prontuarioId={p.id} arquivado={p.status === "ARQUIVADO"} />
          </Cartao>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quem acessou (gestão)
// ---------------------------------------------------------------------------

export async function AbaAcessos({ usuario, prontuario: p, mapas, concessoes }: Ctx) {
  const eventos = await acessosAoProntuario(p.id);
  const podeRevisar = podeRevisarAcessoEmergencial(usuario, p.unidadeOrigemId);
  return (
    <div className="space-y-6">
      <Aviso tom="info">
        Transparência (LGPD, art. 18): se ela pedir, a gestão pode informar quais unidades e profissionais acessaram o
        prontuário. Acessos emergenciais devem ser revisados pela gestão da unidade de origem.
      </Aviso>
      <Cartao>
        <CabecalhoCartao titulo="Permissões de acesso" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">Unidade</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-3 py-2 font-medium">Quando / quem</th>
                <th className="px-3 py-2 font-medium">Justificativa</th>
                <th className="px-5 py-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {concessoes.map((x) => {
                const vigente = concessaoVigente(x as Concessao);
                return (
                  <tr key={x.id} className={cx(x.origem === "EMERGENCIAL" && !x.revisadoEm && vigente && "bg-rose-50/50")}>
                    <td className="px-5 py-3">
                      <SeloUnidade unidade={mapas.unidade(x.unidadeId)} />
                    </td>
                    <td className="px-3 py-3">{ROTULO_ORIGEM_ACESSO[x.origem]}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {formatarDataHora(x.criadoEm)}
                      <br />
                      {mapas.pessoa(x.concedidoPorId).nome}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-xs text-slate-700">{x.justificativa ?? "—"}</td>
                    <td className="px-5 py-3 text-xs">
                      {x.revogadoEm ? (
                        <span className="text-slate-500">Revogado em {formatarData(x.revogadoEm)}</span>
                      ) : !vigente ? (
                        <span className="text-slate-500">Expirou</span>
                      ) : x.expiraEm ? (
                        <span className="text-amber-800">Até {formatarDataHora(x.expiraEm)}</span>
                      ) : (
                        <span className="text-emerald-700">Vigente</span>
                      )}
                      {x.revisadoEm && <span className="block text-slate-500">Revisado por {mapas.pessoa(x.revisadoPorId).nome}</span>}
                      {podeRevisar && vigente && x.origem !== "ORIGEM" && (
                        <div className="mt-2">
                          <FormRevisarAcesso acessoId={x.id} jaRevisado={!!x.revisadoEm} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Trilha de auditoria deste prontuário" descricao="Últimos 300 eventos." />
        <ul className="divide-y divide-slate-100">
          {eventos.map((ev) => (
            <li key={ev.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
              <span className="w-32 shrink-0 text-xs text-slate-500 tabular-nums">{formatarDataHora(ev.criadoEm)}</span>
              <SeloUnidade unidade={mapas.unidade(ev.unidadeId)} />
              <span className="font-medium text-slate-800">{mapas.pessoa(ev.usuarioId).nome}</span>
              <span className={cx("text-slate-600", ev.acao === "ACESSO_EMERGENCIAL" && "font-medium text-rose-700")}>
                {ROTULO_ACAO[ev.acao] ?? ev.acao}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
