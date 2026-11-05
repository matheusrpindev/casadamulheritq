import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { __acolhePool?: Pool };

function criarPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada (veja .env.example).");
  return new Pool({ connectionString: url, max: 10 });
}

// Reaproveita o pool entre recarregamentos do servidor de desenvolvimento.
const pool = globalParaDb.__acolhePool ?? criarPool();
if (process.env.NODE_ENV !== "production") globalParaDb.__acolhePool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
