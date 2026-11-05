import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { NOME_SISTEMA } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: NOME_SISTEMA, template: `%s · ${NOME_SISTEMA}` },
  description: "Prontuário único da rede de atendimento à mulher em situação de violência.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#44246a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
