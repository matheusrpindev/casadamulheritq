import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock, Network, ShieldCheck } from "lucide-react";
import { obterUsuario } from "@/lib/sessao";
import { INSTITUICAO, NOME_SISTEMA, SUBTITULO_SISTEMA } from "@/lib/config";
import { Aviso } from "@/components/ui";
import { LogoCompleto, TriangulosDecorativos } from "@/components/marca";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  if (await obterUsuario()) redirect("/");
  const { motivo } = await searchParams;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-rosa-claro p-12 lg:flex lg:flex-col lg:justify-between">
        <TriangulosDecorativos className="-right-24 -bottom-20 w-[26rem]" opacidade={0.35} />

        <LogoCompleto className="relative w-44" />

        <div className="relative max-w-lg">
          <p className="mb-3 text-sm font-semibold tracking-wide text-marca-600 uppercase">
            {NOME_SISTEMA} · prontuário único da rede
          </p>
          <p className="fonte-titulo text-4xl leading-tight font-bold tracking-tight text-marca-950">
            Ela conta uma vez.
            <br />
            <span className="text-marca-600">A rede inteira acolhe.</span>
          </p>
          <p className="mt-5 text-base leading-relaxed text-slate-700">
            Casa da Mulher, Secretaria e demais serviços de Itaquaquecetuba compartilhando o mesmo prontuário, para que
            nenhuma mulher precise repetir sua história a cada porta que bate.
          </p>
        </div>

        <ul className="relative grid max-w-md gap-4 text-sm text-slate-700">
          <li className="flex gap-3">
            <Network className="size-5 shrink-0 text-marca-600" />
            Relato, avaliação de risco e encaminhamentos compartilhados entre as unidades.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="size-5 shrink-0 text-marca-600" />
            Dados sensíveis criptografados e acesso só para quem atende (LGPD).
          </li>
          <li className="flex gap-3">
            <Lock className="size-5 shrink-0 text-marca-600" />
            Cada visualização fica registrada na trilha de auditoria.
          </li>
        </ul>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoCompleto className="w-28" />
            <p className="mt-4 text-sm text-slate-500">
              {NOME_SISTEMA} · {SUBTITULO_SISTEMA.toLowerCase()}
            </p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrar</h1>
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
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">{INSTITUICAO}</p>
        </div>
      </section>
    </main>
  );
}
