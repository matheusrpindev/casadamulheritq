import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { INSTITUICAO, NOME_SISTEMA } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: NOME_SISTEMA, template: `%s · ${NOME_SISTEMA}` },
  description: `Prontuário único da rede de atendimento à mulher — ${INSTITUICAO}.`,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#2b0a27",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
