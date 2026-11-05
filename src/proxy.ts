import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = ["/login"];

/**
 * Executa antes de toda página:
 * 1. Política de segurança de conteúdo (CSP) com nonce por requisição.
 * 2. Checagem otimista de sessão: sem cookie, vai para o login.
 *    (A validação real acontece no servidor, em exigirUsuario().)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const temCookie = request.cookies.has("acolhe_sessao");
  const publica = ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!temCookie && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // btoa existe em Node e em runtimes de borda (Netlify Edge, Vercel Edge); Buffer não.
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev || process.env.PERMITIR_HTTP === "true" ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", csp);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", csp);
  // Páginas com dados pessoais nunca devem ir para cache de navegador/proxy.
  resposta.headers.set("Cache-Control", "no-store, max-age=0");
  return resposta;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|marca/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
