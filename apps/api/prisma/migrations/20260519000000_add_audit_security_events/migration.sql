-- Sprint M batch 7 — audit log estruturado pra eventos de segurança.
--
-- Schema audit já existe (outbox_events + features_audit). Esta tabela
-- preenche o gap apontado na auditoria: zero registro de role grants,
-- klub admin transfers, cancelamentos, aprovações administrativas etc.
--
-- LGPD Art. 37: rastreabilidade obrigatória do tratamento.
-- Forensics: investigação de incidente sem essa tabela é cega.

CREATE TABLE "audit"."security_events" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id"    UUID,
    "target_type" TEXT NOT NULL,
    "target_id"   UUID,
    "action"      TEXT NOT NULL,
    "before"      JSONB,
    "after"       JSONB,
    "metadata"    JSONB,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- Index pra "o que o user X fez nos últimos N dias" (forensics)
CREATE INDEX "security_events_actor_id_created_at_idx"
  ON "audit"."security_events" ("actor_id", "created_at" DESC);

-- Index pra "histórico de mudanças no recurso X" (timeline)
CREATE INDEX "security_events_target_type_target_id_created_at_idx"
  ON "audit"."security_events" ("target_type", "target_id", "created_at" DESC);

-- Index pra "todos os eventos do tipo Y nos últimos N dias" (alertas)
CREATE INDEX "security_events_action_created_at_idx"
  ON "audit"."security_events" ("action", "created_at" DESC);
