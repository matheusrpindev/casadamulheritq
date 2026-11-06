import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { __acolhePool?: Pool };

function criarPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada (veja .env.example).");
  const pool = new Pool({
    connectionString: url,
    // As telas fazem várias consultas ao mesmo tempo (Promise.all): com conexões suficientes, elas saem juntas.
    max: Number(process.env.DB_POOL_MAX ?? 15),
    // Abrir uma conexão segura com um banco distante leva mais de 1 s (TLS + autenticação). Mantê-la aberta entre
    // um clique e outro evita pagar isso a cada tela. Fica abaixo dos ~5 min em que hospedagens costumam derrubar
    // conexões paradas.
    idleTimeoutMillis: Number(process.env.DB_OCIOSA_MS ?? 4 * 60_000),
    keepAlive: true,
  });
  // Conexão parada derrubada pelo servidor: o pool a descarta e abre outra quando precisar. Sem este ouvinte,
  // o erro derrubaria o processo inteiro.
  pool.on("error", (erro) => console.warn("[banco] conexão ociosa encerrada:", erro.message));
  return pool;
}

// Reaproveita o pool entre recarregamentos do servidor de desenvolvimento.
const pool = globalParaDb.__acolhePool ?? criarPool();
if (process.env.NODE_ENV !== "production") globalParaDb.__acolhePool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
