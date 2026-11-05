// Aplica as migrações do banco (drizzle/). Uso: npm run db:migrar
// Funciona em produção sem dependências de desenvolvimento.
// Em produção as variáveis vêm do ambiente; em desenvolvimento, do arquivo .env.
try {
  await import("dotenv/config");
} catch {}
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url });
try {
  // fileURLToPath (e não .pathname): no Windows, .pathname vira "/C:/..." e o caminho não é encontrado.
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  console.log("✓ Banco atualizado.");
} catch (e) {
  console.error("Falha ao migrar:", e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
