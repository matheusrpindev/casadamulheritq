import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Lock, Network, ShieldCheck } from "lucide-react";
import { obterUsuario } from "@/lib/sessao";
import { NOME_SISTEMA, SUBTITULO_SISTEMA } from "@/lib/config";
import { COOKIE_IDENTIDADE, MARCAS, ROTULO_IDENTIDADE, ehIdentidade, type Identidade } from "@/lib/identidade";
import { Aviso, cx } from "@/components/ui";
import { Decoracao, LogoMarca } from "@/components/marca";
import { FaixaValidacao } from "@/components/faixa-validacao";
import { FormularioLogin } from "./formulario";

export async function generateMetadata(): Promise<Metadata> {
  const valor = (await cookies()).get(COOKIE_IDENTIDADE)?.value;
  return { title: "Entrar", ...(ehIdentidade(valor) ? { icons: { icon: MARCAS[valor].icone } } : {}) };
}

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  if (await obterUsuario()) redirect("/");
  const { motivo } = await searchParams;
  // Identidade do último acesso neste navegador; sem ela, a tela mostra as duas marcas.
  const valor = (await cookies()).get(COOKIE_IDENTIDADE)?.value;
  const identidade: Identidade | null = ehIdentidade(valor) ? valor : null;

  return (
    <div data-identidade={identidade ?? undefined}>
      <FaixaValidacao />
      <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
        <section
          className={cx(
            "relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between",
            identidade ? "bg-destaque-claro" : "bg-zinc-50",
          )}
        >
          {identidade && (
            <Decoracao
              identidade={identidade}
              className={identidade === "SECRETARIA" ? "-right-20 -bottom-24 w-[18rem]" : "-right-24 -bottom-20 w-[26rem]"}
              opacidade={0.35}
            />
          )}

          {identidade === "CASA_DA_MULHER" && <LogoMarca identidade="CASA_DA_MULHER" uso="destaque" className="relative w-40" />}
          {identidade === "SECRETARIA" && <LogoMarca identidade="SECRETARIA" uso="destaque" className="relative w-[30rem] max-w-full" />}
          {!identidade && (
            <div className="relative flex flex-col items-start gap-6">
              <LogoMarca identidade="SECRETARIA" uso="horizontal" className="w-[30rem] max-w-full" />
              <LogoMarca identidade="CASA_DA_MULHER" uso="horizontal" className="w-52" />
            </div>
          )}

          <div className="relative max-w-lg">
            <p className="mb-3 text-sm font-semibold tracking-wide text-marca-600 uppercase">{NOME_SISTEMA} · prontuário único da rede</p>
            <p className="fonte-titulo text-4xl leading-tight font-bold tracking-tight text-marca-950">
              Ela conta uma vez.
              <br />
              <span className="text-marca-600">A rede inteira acolhe.</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-zinc-700">
              Casa da Mulher, Secretaria e demais serviços de Itaquaquecetuba compartilhando o mesmo prontuário, para que
              nenhuma mulher precise repetir sua história a cada porta que bate.
            </p>
          </div>

          <ul className="relative grid max-w-md gap-4 text-sm text-zinc-700">
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
            <div className="mb-8 flex flex-col items-center gap-4 text-center lg:hidden">
              {identidade === "CASA_DA_MULHER" && <LogoMarca identidade="CASA_DA_MULHER" uso="horizontal" className="w-60" />}
              {identidade === "SECRETARIA" && <LogoMarca identidade="SECRETARIA" uso="horizontal" className="w-full" />}
              {!identidade && (
                <>
                  <LogoMarca identidade="SECRETARIA" uso="horizontal" className="w-full" />
                  <LogoMarca identidade="CASA_DA_MULHER" uso="horizontal" className="w-44" />
                </>
              )}
              <p className="text-sm text-zinc-500">
                {NOME_SISTEMA} · {SUBTITULO_SISTEMA.toLowerCase()}
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Entrar</h1>
            <p className="mt-1 mb-6 text-sm text-zinc-500">Acesso restrito a profissionais da rede.</p>

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

            <p className="mt-8 text-xs leading-relaxed text-zinc-500">
              Esqueceu a senha? Peça à gestão da sua unidade para redefini-la. Não compartilhe seu acesso: tudo o que é
              feito com ele fica registrado em seu nome.
            </p>
            <p className="mt-6 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
              {identidade ? ROTULO_IDENTIDADE[identidade] : `${ROTULO_IDENTIDADE.CASA_DA_MULHER} · ${ROTULO_IDENTIDADE.SECRETARIA}`}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
