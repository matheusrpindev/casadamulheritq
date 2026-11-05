import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartHandshake, Lock, Network, ShieldCheck } from "lucide-react";
import { obterUsuario } from "@/lib/sessao";
import { NOME_REDE, NOME_SISTEMA, SUBTITULO_SISTEMA } from "@/lib/config";
import { Aviso } from "@/components/ui";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  if (await obterUsuario()) redirect("/");
  const { motivo } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-lilas-950 via-lilas-900 to-lilas-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-32 -right-32 size-[28rem] rounded-full bg-lilas-500/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <HeartHandshake className="size-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{NOME_SISTEMA}</p>
            <p className="text-sm text-lilas-200">Rede de atendimento à mulher · {NOME_REDE}</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-4xl leading-tight font-semibold tracking-tight">
            Ela conta uma vez.
            <br />
            <span className="text-lilas-200">A rede inteira acolhe.</span>
          </p>
          <p className="mt-5 text-base leading-relaxed text-lilas-100/90">
            Um prontuário único entre Casa da Mulher, Secretaria e demais serviços, para que nenhuma mulher precise
            repetir sua história a cada porta que bate.
          </p>
        </div>

        <ul className="relative grid gap-4 text-sm text-lilas-100">
          <li className="flex gap-3">
            <Network className="size-5 shrink-0 text-lilas-300" />
            Relato, avaliação de risco e encaminhamentos compartilhados entre as unidades.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-lilas-300" />
            Dados sensíveis criptografados e acesso só para quem atende (LGPD).
          </li>
          <li className="flex gap-3">
            <Lock className="size-5 shrink-0 text-lilas-300" />
            Cada visualização fica registrada na trilha de auditoria.
          </li>
        </ul>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-2xl font-semibold text-lilas-900">{NOME_SISTEMA}</p>
            <p className="text-sm text-slate-500">{SUBTITULO_SISTEMA}</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Entrar</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">Acesso restrito a profissionais da rede.</p>

          {motivo === "inatividade" && (
            <Aviso tom="atencao" className="mb-5" titulo="Sessão encerrada por inatividade">
              Para proteger os dados das mulheres atendidas, o sistema sai sozinho quando o computador fica parado.
            </Aviso>
          )}
          {motivo === "saiu" && (
            <Aviso tom="sucesso" className="mb-5">
              Você saiu do sistema com segurança.
            </Aviso>
          )}

          <FormularioLogin />

          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Esqueceu a senha? Peça à gestão da sua unidade para redefini-la. Não compartilhe seu acesso: tudo o que é
            feito com ele fica registrado em seu nome.
          </p>
        </div>
      </section>
    </main>
  );
}
