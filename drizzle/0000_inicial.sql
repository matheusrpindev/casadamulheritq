CREATE TYPE "public"."especialidade" AS ENUM('PSICOLOGIA', 'SERVICO_SOCIAL', 'JURIDICO', 'SAUDE', 'ACOLHIMENTO', 'ADMINISTRATIVO', 'OUTRA');--> statement-breakpoint
CREATE TYPE "public"."nivel_risco" AS ENUM('NAO_AVALIADO', 'BAIXO', 'MEDIO', 'ELEVADO');--> statement-breakpoint
CREATE TYPE "public"."origem_acesso" AS ENUM('ORIGEM', 'ENCAMINHAMENTO', 'AUTORIZACAO', 'EMERGENCIAL');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('ADMIN', 'GESTORA', 'TECNICA', 'RECEPCAO');--> statement-breakpoint
CREATE TYPE "public"."sigilo" AS ENUM('REDE', 'UNIDADE', 'ESPECIALIDADE');--> statement-breakpoint
CREATE TYPE "public"."status_encaminhamento" AS ENUM('ENVIADO', 'RECEBIDO', 'CONCLUIDO', 'RECUSADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."status_medida" AS ENUM('SOLICITADA', 'DEFERIDA', 'INDEFERIDA', 'REVOGADA', 'ENCERRADA');--> statement-breakpoint
CREATE TYPE "public"."status_prontuario" AS ENUM('ATIVO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_atendimento" AS ENUM('ACOLHIMENTO', 'PSICOLOGICO', 'SOCIAL', 'JURIDICO', 'SAUDE', 'RETORNO', 'CONTATO_TELEFONICO', 'VISITA', 'GRUPO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_unidade" AS ENUM('CASA_DA_MULHER', 'SECRETARIA', 'CREAS', 'CRAS', 'DELEGACIA', 'SAUDE', 'JURIDICO', 'ABRIGO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."urgencia" AS ENUM('ROTINA', 'PRIORITARIA', 'URGENTE');--> statement-breakpoint
CREATE TYPE "public"."vinculo_autor" AS ENUM('CONJUGE_COMPANHEIRO', 'EX_CONJUGE_COMPANHEIRO', 'NAMORADO', 'EX_NAMORADO', 'PAI_PADRASTO', 'MAE_MADRASTA', 'FILHO', 'IRMAO', 'OUTRO_FAMILIAR', 'CONHECIDO', 'DESCONHECIDO', 'OUTRO');--> statement-breakpoint
CREATE TABLE "acessos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"unidade_id" uuid NOT NULL,
	"origem" "origem_acesso" NOT NULL,
	"justificativa" text,
	"concedido_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone,
	"revogado_em" timestamp with time zone,
	"revisado_por_id" uuid,
	"revisado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "atendimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"unidade_id" uuid NOT NULL,
	"profissional_id" uuid NOT NULL,
	"especialidade" "especialidade",
	"tipo" "tipo_atendimento" NOT NULL,
	"realizado_em" timestamp with time zone NOT NULL,
	"texto_cifrado" text NOT NULL,
	"sigilo" "sigilo" DEFAULT 'REDE' NOT NULL,
	"retifica_id" uuid,
	"motivo_retificacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"unidade_id" uuid,
	"acao" text NOT NULL,
	"prontuario_id" uuid,
	"alvo" text,
	"detalhes" jsonb,
	"ip" text,
	"user_agent" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"nome_cifrado" text NOT NULL,
	"vinculo" "vinculo_autor" NOT NULL,
	"acesso_arma" text DEFAULT 'NAO_SABE' NOT NULL,
	"observacoes_cifrado" text,
	"unidade_id" uuid NOT NULL,
	"criado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes_risco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"unidade_id" uuid NOT NULL,
	"profissional_id" uuid NOT NULL,
	"respostas_cifrado" text NOT NULL,
	"fatores_graves" integer DEFAULT 0 NOT NULL,
	"sugestao" "nivel_risco" NOT NULL,
	"classificacao" "nivel_risco" NOT NULL,
	"justificativa_cifrado" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encaminhamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"origem_unidade_id" uuid NOT NULL,
	"destino_unidade_id" uuid,
	"destino_externo" text,
	"criado_por_id" uuid NOT NULL,
	"motivo_cifrado" text NOT NULL,
	"urgencia" "urgencia" DEFAULT 'ROTINA' NOT NULL,
	"status" "status_encaminhamento" DEFAULT 'ENVIADO' NOT NULL,
	"recebido_por_id" uuid,
	"recebido_em" timestamp with time zone,
	"concluido_em" timestamp with time zone,
	"resposta_cifrado" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medidas_protetivas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"numero_processo" text,
	"medidas" text[] DEFAULT '{}' NOT NULL,
	"observacoes_cifrado" text,
	"status" "status_medida" DEFAULT 'SOLICITADA' NOT NULL,
	"solicitada_em" date,
	"decidida_em" date,
	"valida_ate" date,
	"unidade_id" uuid NOT NULL,
	"registrado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prontuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" serial NOT NULL,
	"nome_civil" text NOT NULL,
	"nome_social" text,
	"nome_busca" text NOT NULL,
	"data_nascimento" date,
	"cpf_cifrado" text,
	"cpf_indice" text,
	"identidade_genero" text,
	"raca_cor" text,
	"escolaridade" text,
	"ocupacao" text,
	"telefone_cifrado" text,
	"contato_seguro" boolean DEFAULT true NOT NULL,
	"pode_deixar_recado" boolean DEFAULT false NOT NULL,
	"melhor_horario" text,
	"orientacoes_contato_cifrado" text,
	"endereco_cifrado" text,
	"bairro" text,
	"compartilhamento_autorizado" boolean DEFAULT false NOT NULL,
	"consentimento_registrado_em" timestamp with time zone,
	"consentimento_registrado_por_id" uuid,
	"status" "status_prontuario" DEFAULT 'ATIVO' NOT NULL,
	"nivel_risco" "nivel_risco" DEFAULT 'NAO_AVALIADO' NOT NULL,
	"risco_atualizado_em" timestamp with time zone,
	"unidade_origem_id" uuid NOT NULL,
	"criado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relatos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prontuario_id" uuid NOT NULL,
	"unidade_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"especialidade" "especialidade",
	"data_fato" date,
	"local_fato_cifrado" text,
	"tipos_violencia" text[] DEFAULT '{}' NOT NULL,
	"texto_cifrado" text NOT NULL,
	"sigilo" "sigilo" DEFAULT 'REDE' NOT NULL,
	"retifica_id" uuid,
	"motivo_retificacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"ultima_atividade_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"sigla" text NOT NULL,
	"tipo" "tipo_unidade" NOT NULL,
	"endereco" text,
	"telefone" text,
	"cor" text DEFAULT '#7c3aed' NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" "papel" NOT NULL,
	"especialidade" "especialidade",
	"registro_profissional" text,
	"unidade_id" uuid NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"precisa_trocar_senha" boolean DEFAULT true NOT NULL,
	"tentativas_falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	"ultimo_acesso_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_concedido_por_id_usuarios_id_fk" FOREIGN KEY ("concedido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acessos" ADD CONSTRAINT "acessos_revisado_por_id_usuarios_id_fk" FOREIGN KEY ("revisado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_profissional_id_usuarios_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_retifica_id_atendimentos_id_fk" FOREIGN KEY ("retifica_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autores" ADD CONSTRAINT "autores_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autores" ADD CONSTRAINT "autores_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autores" ADD CONSTRAINT "autores_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_risco" ADD CONSTRAINT "avaliacoes_risco_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_risco" ADD CONSTRAINT "avaliacoes_risco_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes_risco" ADD CONSTRAINT "avaliacoes_risco_profissional_id_usuarios_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_origem_unidade_id_unidades_id_fk" FOREIGN KEY ("origem_unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_destino_unidade_id_unidades_id_fk" FOREIGN KEY ("destino_unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_recebido_por_id_usuarios_id_fk" FOREIGN KEY ("recebido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medidas_protetivas" ADD CONSTRAINT "medidas_protetivas_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medidas_protetivas" ADD CONSTRAINT "medidas_protetivas_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medidas_protetivas" ADD CONSTRAINT "medidas_protetivas_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_consentimento_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("consentimento_registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_unidade_origem_id_unidades_id_fk" FOREIGN KEY ("unidade_origem_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prontuarios" ADD CONSTRAINT "prontuarios_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatos" ADD CONSTRAINT "relatos_prontuario_id_prontuarios_id_fk" FOREIGN KEY ("prontuario_id") REFERENCES "public"."prontuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatos" ADD CONSTRAINT "relatos_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatos" ADD CONSTRAINT "relatos_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatos" ADD CONSTRAINT "relatos_retifica_id_relatos_id_fk" FOREIGN KEY ("retifica_id") REFERENCES "public"."relatos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidade_id_unidades_id_fk" FOREIGN KEY ("unidade_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acessos_prontuario_unidade_idx" ON "acessos" USING btree ("prontuario_id","unidade_id");--> statement-breakpoint
CREATE INDEX "atendimentos_prontuario_idx" ON "atendimentos" USING btree ("prontuario_id");--> statement-breakpoint
CREATE INDEX "auditoria_prontuario_idx" ON "auditoria" USING btree ("prontuario_id","criado_em");--> statement-breakpoint
CREATE INDEX "auditoria_usuario_idx" ON "auditoria" USING btree ("usuario_id","criado_em");--> statement-breakpoint
CREATE INDEX "auditoria_acao_idx" ON "auditoria" USING btree ("acao","criado_em");--> statement-breakpoint
CREATE INDEX "autores_prontuario_idx" ON "autores" USING btree ("prontuario_id");--> statement-breakpoint
CREATE INDEX "avaliacoes_prontuario_idx" ON "avaliacoes_risco" USING btree ("prontuario_id");--> statement-breakpoint
CREATE INDEX "encaminhamentos_destino_idx" ON "encaminhamentos" USING btree ("destino_unidade_id","status");--> statement-breakpoint
CREATE INDEX "encaminhamentos_prontuario_idx" ON "encaminhamentos" USING btree ("prontuario_id");--> statement-breakpoint
CREATE INDEX "medidas_prontuario_idx" ON "medidas_protetivas" USING btree ("prontuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prontuarios_numero_uk" ON "prontuarios" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "prontuarios_cpf_idx" ON "prontuarios" USING btree ("cpf_indice");--> statement-breakpoint
CREATE INDEX "prontuarios_nascimento_idx" ON "prontuarios" USING btree ("data_nascimento");--> statement-breakpoint
CREATE INDEX "relatos_prontuario_idx" ON "relatos" USING btree ("prontuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_uk" ON "usuarios" USING btree ("email");