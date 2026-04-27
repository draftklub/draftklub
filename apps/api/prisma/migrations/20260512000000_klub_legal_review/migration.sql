-- Sprint D PR1 — Klub legal review (cadastro com aprovação administrativa)

ALTER TABLE "klub"."klubs"
  ADD COLUMN "address_street"          TEXT,
  ADD COLUMN "address_number"          TEXT,
  ADD COLUMN "address_complement"      TEXT,
  ADD COLUMN "address_neighborhood"    TEXT,
  ADD COLUMN "address_source"          TEXT,
  ADD COLUMN "cnpj_status"             TEXT,
  ADD COLUMN "cnpj_status_checked_at"  TIMESTAMPTZ,
  ADD COLUMN "cnpj_lookup_data"        JSONB,
  ADD COLUMN "review_status"           TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "review_decision_at"      TIMESTAMPTZ,
  ADD COLUMN "review_decided_by_id"    UUID,
  ADD COLUMN "review_rejection_reason" TEXT;

-- Klubs já existentes em produção (criados antes desta migration) precisam
-- entrar como 'approved' pra não sumirem de discover/auth de uma hora pra
-- outra. Cadastros novos via /criar-klub vão default 'pending' (default
-- da coluna). Idempotente: rodar de novo é no-op porque o WHERE filtra.
UPDATE "klub"."klubs"
   SET "review_status" = 'approved'
 WHERE "review_status" = 'pending'
   AND "created_at" < NOW();

CREATE INDEX "idx_klubs_review_pending"
    ON "klub"."klubs" ("review_status")
 WHERE "review_status" = 'pending';
