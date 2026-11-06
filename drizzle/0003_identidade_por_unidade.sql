CREATE TYPE "public"."identidade_visual" AS ENUM('CASA_DA_MULHER', 'SECRETARIA');--> statement-breakpoint
ALTER TABLE "unidades" ADD COLUMN "identidade" "identidade_visual" DEFAULT 'SECRETARIA' NOT NULL;--> statement-breakpoint
-- Unidades do tipo Casa da Mulher usam a identidade da Casa; as demais, a da Secretaria.
UPDATE "unidades" SET "identidade" = 'CASA_DA_MULHER' WHERE "tipo" = 'CASA_DA_MULHER';
