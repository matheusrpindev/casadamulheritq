import "server-only";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Subconsulta: ids de prontuários que a unidade pode abrir agora. */
export function idsAcessiveisPelaUnidade(unidadeId: string) {
  return db
    .select({ id: schema.acessos.prontuarioId })
    .from(schema.acessos)
    .where(
      and(
        eq(schema.acessos.unidadeId, unidadeId),
        isNull(schema.acessos.revogadoEm),
        or(isNull(schema.acessos.expiraEm), gt(schema.acessos.expiraEm, sql`now()`)),
      ),
    );
}
