import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/pt-sans/400.css";
import "@fontsource/pt-sans/700.css";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { INSTITUICAO, NOME_SISTEMA } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: NOME_SISTEMA, template: `%s · ${NOME_SISTEMA}` },
  description: `Prontuário único da rede de atendimento à mulher — ${INSTITUICAO}.`,
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/marca/icone-casa.svg" },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#2c0a28",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
