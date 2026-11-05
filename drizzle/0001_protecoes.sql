-- Proteções de integridade aplicadas no próprio banco.
-- Mesmo que alguém acesse o banco direto (ou haja um bug na aplicação),
-- a trilha de auditoria e os registros técnicos não podem ser alterados ou apagados.

CREATE OR REPLACE FUNCTION bloquear_alteracao() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Registros da tabela % não podem ser alterados nem apagados (% bloqueado). Correções são feitas por retificação.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao();
--> statement-breakpoint
CREATE TRIGGER relatos_somente_acrescimo BEFORE UPDATE OR DELETE ON relatos
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao();
--> statement-breakpoint
CREATE TRIGGER atendimentos_somente_acrescimo BEFORE UPDATE OR DELETE ON atendimentos
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao();
--> statement-breakpoint
CREATE TRIGGER avaliacoes_somente_acrescimo BEFORE UPDATE OR DELETE ON avaliacoes_risco
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao();
--> statement-breakpoint
-- Prontuários são arquivados, nunca apagados.
CREATE TRIGGER prontuarios_sem_exclusao BEFORE DELETE ON prontuarios
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao();
