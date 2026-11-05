import type { NextConfig } from "next";

/**
 * Todo o sistema fica atrás de login e lida com dados sensíveis (LGPD art. 11),
 * então NÃO usamos Cache Components: cada página é renderizada por requisição
 * e nada derivado de sessão é guardado em cache no servidor.
 */
const nextConfig: NextConfig = {
  // Pacote autossuficiente só para a imagem Docker; Netlify/Vercel usam o próprio empacotamento.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  serverExternalPackages: ["pg", "bcryptjs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [{ source: "/indicadores", destination: "/relatorios", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
