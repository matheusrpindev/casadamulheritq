import Link from "next/link";
import { classeBotao } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-marca-700">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">O endereço pode estar errado, ou o registro não existe mais.</p>
        <Link href="/" className={classeBotao("primario", "md", "mt-6")}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
