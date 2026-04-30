-- DB-6a: Extract KlubLegal sub-table from Klub god-aggregate
-- Moves legal identity fields out of klubs into a 1:1 klub_legal table.
-- Includes inline data migration before column drop.

CREATE TABLE "klub"."klub_legal" (
  "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
  "klub_id"               UUID        NOT NULL,
  "entity_type"           "klub"."KlubEntityType",
  "document_encrypted"    TEXT,
  "document_iv"           TEXT,
  "document_hint"         TEXT,
  "legal_name"            TEXT,
  "kyc_status"            "klub"."KlubKycStatus" NOT NULL DEFAULT 'pending',
  "cnpj_status"           TEXT,
  "cnpj_status_checked_at" TIMESTAMPTZ,
  "cnpj_lookup_data"      JSONB,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "klub_legal_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "klub_legal_klub_id_key" UNIQUE ("klub_id"),
  CONSTRAINT "klub_legal_klub_id_fkey" FOREIGN KEY ("klub_id")
    REFERENCES "klub"."klubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Data migration: copy existing legal data from klubs into klub_legal.
-- Every existing Klub gets a legal record (kyc_status defaults to 'pending').
INSERT INTO "klub"."klub_legal" (
  "klub_id", "entity_type", "document_encrypted", "document_iv",
  "document_hint", "legal_name", "kyc_status", "cnpj_status",
  "cnpj_status_checked_at", "cnpj_lookup_data"
)
SELECT
  "id", "entity_type", "document_encrypted", "document_iv",
  "document_hint", "legal_name", "kyc_status", "cnpj_status",
  "cnpj_status_checked_at", "cnpj_lookup_data"
FROM "klub"."klubs";

-- Drop migrated columns from klubs
ALTER TABLE "klub"."klubs"
  DROP COLUMN "entity_type",
  DROP COLUMN "document_encrypted",
  DROP COLUMN "document_iv",
  DROP COLUMN "document_hint",
  DROP COLUMN "legal_name",
  DROP COLUMN "kyc_status",
  DROP COLUMN "cnpj_status",
  DROP COLUMN "cnpj_status_checked_at",
  DROP COLUMN "cnpj_lookup_data";
