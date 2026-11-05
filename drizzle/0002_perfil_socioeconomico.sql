ALTER TABLE "prontuarios" ADD COLUMN "quantidade_filhos" integer;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "filhos_menores" integer;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "gestante" boolean;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "pessoa_com_deficiencia" boolean;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "estado_civil" text;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "situacao_trabalho" text;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "renda_familiar" text;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "recebe_beneficio" boolean;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "situacao_moradia" text;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD COLUMN "dependencia_financeira" boolean;