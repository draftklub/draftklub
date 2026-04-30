-- DB-6e: Extract KlubBilling from Klub god-aggregate

CREATE TABLE "klub"."klub_billing" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "klub_id"         UUID        NOT NULL,
  "amenities"       JSONB       NOT NULL DEFAULT '{}',
  "trial_ends_at"   TIMESTAMPTZ,
  "max_members"     INTEGER     NOT NULL DEFAULT 50,
  "max_sports"      INTEGER     NOT NULL DEFAULT 2,
  "max_courts"      INTEGER     NOT NULL DEFAULT 3,
  "tx_fee_rate"     DECIMAL(5,4) NOT NULL DEFAULT 0.025,
  "billing_klub_id" UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "klub_billing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "klub_billing_klub_id_key" UNIQUE ("klub_id"),
  CONSTRAINT "klub_billing_klub_id_fkey"
    FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing data
INSERT INTO "klub"."klub_billing" (
  "klub_id", "amenities", "trial_ends_at",
  "max_members", "max_sports", "max_courts",
  "tx_fee_rate", "billing_klub_id",
  "created_at", "updated_at"
)
SELECT
  "id", "amenities", "trial_ends_at",
  "max_members", "max_sports", "max_courts",
  "tx_fee_rate", "billing_klub_id",
  now(), now()
FROM "klub"."klubs";

-- Drop migrated columns from klubs
ALTER TABLE "klub"."klubs"
  DROP COLUMN "amenities",
  DROP COLUMN "trial_ends_at",
  DROP COLUMN "max_members",
  DROP COLUMN "max_sports",
  DROP COLUMN "max_courts",
  DROP COLUMN "tx_fee_rate",
  DROP COLUMN "billing_klub_id";
