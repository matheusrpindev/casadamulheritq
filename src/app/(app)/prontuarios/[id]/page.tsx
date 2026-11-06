import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { AlertOctagon, Archive, Clock, Gavel, Lock, PhoneOff, Printer, Send, ShieldCheck, ShieldOff } from "lucide-react";
import { db, schema } from "@/db";
import { exigirUsuario } from "@/lib/sessao";
import { registrarAuditoria } from "@/lib/auditoria";
import { buscarRegistros, carregarProntuario, ehUuid, mapasRede, montarConteudo } from "@/lib/dados/prontuario";
import { podeRegistrarAtendimento, podeSolicitarAcessoEmergencial, podeVerAcessosDoProntuario } from "@/lib/permissoes";
import { formatarData, formatarDataHora, hojeISO, idade, instante, nomeExibicao, numeroProntuario } from "@/lib/texto";
import { PREFIXO_PRONTUARIO } from "@/lib/config";
import { Aviso, BotaoLink, Cartao, Selo, SeloUnidade } from "@/components/ui";
import { Avatar, SeloRisco } from "@/components/selos";
import { PedidoAcesso } from "../../busca/pedido-acesso";
import { LinkAba } from "./link-aba";
import {
  AbaAcessos,
  AbaAtendimentos,
  AbaAutores,
  AbaCadastro,
  AbaEncaminhamentos,
  AbaMedidas,
  AbaRelatos,
  AbaResumo,
  AbaRisco,
} from "./abas";

export const metadata: Metadata = { title: "Prontuário" };

const ABAS = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "relatos", rotulo: "Relatos" },
  { id: "atendimentos", rotulo: "Atendimentos" },
  { id: "risco", rotulo: "Risco" },
  { id: "encaminhamentos", rotulo: "Encaminhamentos" },
  { id: "medidas", rotulo: "Medidas" },
  { id: "autores", rotulo: "Autor" },
  { id: "cadastro", rotulo: "Cadastro" },
  { id: "acessos", rotulo: "Acessos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export default async function PaginaProntuario({ params, searchParams }: PageProps<"/prontuarios/[id]">) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const sp = await searchParams;
  // Uma ida ao banco para tudo: prontuário, permissões, unidades, registros e a última visualização. Os registros
  // (cifrados) só são decifrados depois da checagem de acesso, logo abaixo.
  const valido = ehUuid(id);
  const [carga, mapas, registros, recente] = await Promise.all([
    carregarProntuario(usuario, id),
    mapasRede(),
    valido ? buscarRegistros(id) : null,
    valido ? vistoRecentemente(usuario.id, id) : true,
  ]);

  if (carga.situacao === "nao-encontrado") notFound();
  if (carga.situacao === "sem-acesso") {
    const p = carga.prontuario;
    return (
      <div className="mx-auto max-w-2xl">
        <Cartao className="p-8 text-center">
          <Lock className="mx-auto size-10 text-zinc-300" />
          <h1 className="mt-3 text-lg font-semibold text-zinc-900">Sua unidade não tem acesso a este prontuário</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {nomeExibicao(p)} · {numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-zinc-500">
            O acesso é liberado quando ela é encaminhada para sua unidade com autorização, quando ela autoriza
            diretamente, ou em situação de emergência.
          </p>
          {podeSolicitarAcessoEmergencial(usuario) && (
            <div className="mt-6 flex justify-center text-left">
              <PedidoAcesso prontuarioId={p.id} autorizado={p.compartilhamentoAutorizado} />
            </div>
          )}
        </Cartao>
      </div>
    );
  }

  const { prontuario: p, concessoes, apenasEmergencial, expiraEmergencialEm } = carga;
  const conteudo = montarConteudo(usuario, registros!, mapas);

  // Trilha de auditoria: uma visualização a cada 10 min por pessoa (trocar de aba não gera ruído).
  if (!recente) {
    await registrarAuditoria(
      "PRONTUARIO_VISUALIZADO",
      { usuarioId: usuario.id, unidadeId: usuario.unidadeId },
      { prontuarioId: p.id, detalhes: { emergencial: apenasEmergencial } },
    );
  }

  const abasVisiveis = ABAS.filter((a) => a.id !== "acessos" || podeVerAcessosDoProntuario(usuario));
  const abaPedida = typeof sp.aba === "string" ? sp.aba : "resumo";
  const aba: Aba = abasVisiveis.some((a) => a.id === abaPedida) ? (abaPedida as Aba) : "resumo";

  const hoje = hojeISO();
  const medidasVigentes = conteudo.medidas.filter((m) => m.status === "DEFERIDA" && (!m.validaAte || m.validaAte >= hoje));
  const anos = idade(p.dataNascimento);
  const tecnica = podeRegistrarAtendimento(usuario);
  const contagem: Partial<Record<Aba, number>> = {
    relatos: conteudo.relatos.length,
    atendimentos: conteudo.atendimentos.length,
    risco: conteudo.avaliacoes.length,
    encaminhamentos: conteudo.encaminhamentos.filter((e) => e.status === "ENVIADO" || e.status === "RECEBIDO").length,
    medidas: medidasVigentes.length,
    autores: conteudo.autores.length,
  };
  const ctx = { usuario, prontuario: p, conteudo, mapas, concessoes, tecnica, medidasVigentes };

  return (
    <div className="space-y-6">
      {sp.novo === "1" && (
        <Aviso tom="sucesso" titulo="Prontuário aberto">
          A partir de agora, qualquer unidade que ela procurar e que tiver acesso encontra este histórico. Se for
          encaminhá-la, use a aba Encaminhamentos.
        </Aviso>
      )}

      {/* Cabeçalho */}
      <Cartao className="overflow-hidden">
        <div className="flex flex-wrap items-start gap-5 p-5 sm:p-6">
          <Avatar nome={nomeExibicao(p)} className="hidden size-14 text-base sm:grid" />
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{nomeExibicao(p)}</h1>
              <SeloRisco nivel={p.nivelRisco} grande />
              {p.status === "ARQUIVADO" && (
                <Selo>
                  <Archive className="size-3.5" /> Arquivado
                </Selo>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
              {p.nomeSocial && <span>Registro civil: {p.nomeCivil} ·</span>}
              <span>{anos !== null ? `${anos} anos` : "Idade não informada"}</span>
              <span>·</span>
              <span className="font-mono text-xs">{numeroProntuario(p.numero, p.criadoEm, PREFIXO_PRONTUARIO)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                aberto em {formatarData(p.criadoEm)} na <SeloUnidade unidade={mapas.unidade(p.unidadeOrigemId)} />
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.compartilhamentoAutorizado ? (
                <Selo tom="verde">
                  <ShieldCheck className="size-3.5" /> Autorizou compartilhar com a rede
                </Selo>
              ) : (
                <Selo tom="ambar">
                  <ShieldOff className="size-3.5" /> Não autorizou compartilhar com a rede
                </Selo>
              )}
              {medidasVigentes.length > 0 && (
                <Selo tom="marca">
                  <Gavel className="size-3.5" /> Medida protetiva vigente
                  {medidasVigentes[0].validaAte && ` até ${formatarData(medidasVigentes[0].validaAte)}`}
                </Selo>
              )}
            </div>
          </div>
          <div className="nao-imprimir flex flex-wrap gap-2">
            <BotaoLink href={`/prontuarios/${p.id}/imprimir`} variante="secundario" tamanho="sm" target="_blank">
              <Printer className="size-4" /> Imprimir
            </BotaoLink>
            {tecnica && p.status === "ATIVO" && (
              <BotaoLink href={`/prontuarios/${p.id}?aba=encaminhamentos#novo`} tamanho="sm">
                <Send className="size-4" /> Encaminhar
              </BotaoLink>
            )}
          </div>
        </div>

        {(!p.contatoSeguro || apenasEmergencial) && (
          <div className="space-y-px border-t border-zinc-100">
            {!p.contatoSeguro && (
              <div className="flex items-center gap-2 bg-rose-50 px-6 py-2.5 text-sm text-rose-900">
                <PhoneOff className="size-4 shrink-0" />
                <span>
                  <strong>Contato telefônico pode colocá-la em risco.</strong> Leia as orientações de contato antes de ligar
                  (aba Cadastro).
                </span>
              </div>
            )}
            {apenasEmergencial && (
              <div className="flex items-center gap-2 bg-amber-50 px-6 py-2.5 text-sm text-amber-950">
                <Clock className="size-4 shrink-0" />
                <span>
                  Você está vendo este prontuário por <strong>acesso emergencial</strong>
                  {expiraEmergencialEm && `, válido até ${formatarDataHora(expiraEmergencialEm)}`}. Para acompanhar o caso,
                  peça um encaminhamento à unidade de origem.
                </span>
              </div>
            )}
          </div>
        )}

        <nav className="nao-imprimir flex gap-1 overflow-x-auto border-t border-zinc-100 px-3" aria-label="Seções do prontuário">
          {abasVisiveis.map((a) => (
            <LinkAba
              key={a.id}
              href={`/prontuarios/${p.id}${a.id === "resumo" ? "" : `?aba=${a.id}`}`}
              ativa={aba === a.id}
              rotulo={a.rotulo}
              contagem={contagem[a.id]}
            />
          ))}
        </nav>
      </Cartao>

      {p.status === "ARQUIVADO" && (
        <Aviso tom="atencao" icone={<AlertOctagon className="size-4" />}>
          Este prontuário está arquivado. Os registros continuam disponíveis para consulta; a gestão pode reativá-lo na
          aba Cadastro.
        </Aviso>
      )}

      {aba === "resumo" && <AbaResumo {...ctx} />}
      {aba === "relatos" && <AbaRelatos {...ctx} />}
      {aba === "atendimentos" && <AbaAtendimentos {...ctx} />}
      {aba === "risco" && <AbaRisco {...ctx} />}
      {aba === "encaminhamentos" && <AbaEncaminhamentos {...ctx} />}
      {aba === "medidas" && <AbaMedidas {...ctx} />}
      {aba === "autores" && <AbaAutores {...ctx} />}
      {aba === "cadastro" && <AbaCadastro {...ctx} />}
      {aba === "acessos" && <AbaAcessos {...ctx} />}
    </div>
  );
}

/** Esta pessoa já teve uma visualização deste prontuário registrada nos últimos 10 minutos? */
async function vistoRecentemente(usuarioId: string, prontuarioId: string) {
  const linhas = await db
    .select({ id: schema.auditoria.id })
    .from(schema.auditoria)
    .where(
      and(
        eq(schema.auditoria.usuarioId, usuarioId),
        eq(schema.auditoria.prontuarioId, prontuarioId),
        eq(schema.auditoria.acao, "PRONTUARIO_VISUALIZADO"),
        gt(schema.auditoria.criadoEm, instante(-10 * 60000)),
      ),
    )
    .limit(1);
  return linhas.length > 0;
}
