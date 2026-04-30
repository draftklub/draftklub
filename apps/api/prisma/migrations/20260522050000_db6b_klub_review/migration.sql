-- DB-6b: Extract KlubReview sub-table from Klub god-aggregate
-- Moves review workflow fields out of klubs into a 1:1 klub_review table.

CREATE TABLE "klub"."klub_review" (
  "id"                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  "klub_id"                 UUID        NOT NULL,
  "review_status"           "klub"."KlubReviewStatus" NOT NULL DEFAULT 'pending',
  "review_decision_at"      TIMESTAMPTZ,
  "review_decided_by_id"    UUID,
  "review_rejection_reason" TEXT,
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "klub_review_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "klub_review_klub_id_key" UNIQUE ("klub_id"),
  CONSTRAINT "klub_review_klub_id_fkey" FOREIGN KEY ("klub_id")
    REFERENCES "klub"."klubs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "klub_review_decided_by_fkey" FOREIGN KEY ("review_decided_by_id")
    REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Data migration: copy review state for every existing Klub.
INSERT INTO "klub"."klub_review" (
  "klub_id", "review_status", "review_decision_at",
  "review_decided_by_id", "review_rejection_reason"
)
SELECT
  "id", "review_status", "review_decision_at",
  "review_decided_by_id", "review_rejection_reason"
FROM "klub"."klubs";

-- Drop the old FK that DB-3 may have added for review_decided_by_id on klubs.
ALTER TABLE "klub"."klubs"
  DROP CONSTRAINT IF EXISTS "klubs_review_decided_by_id_fkey";

-- Drop migrated columns from klubs.
ALTER TABLE "klub"."klubs"
  DROP COLUMN "review_status",
  DROP COLUMN "review_decision_at",
  DROP COLUMN "review_decided_by_id",
  DROP COLUMN "review_rejection_reason";
