-- ═══════════════════════════════════════════════════════════
-- Space: hour bands + allowed match types + slot granularity check
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "space"."spaces"
  ADD COLUMN "hour_bands" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "allowed_match_types" JSONB NOT NULL DEFAULT '["singles","doubles"]'::jsonb;

-- Check constraint: granularity entre 15 e 180, multiplo de 15.
-- Dados existentes em dev usam default 30 (multiplo de 15) entao constraint
-- valida sem precisar de NOT VALID.
ALTER TABLE "space"."spaces"
  ADD CONSTRAINT "spaces_slot_granularity_check"
  CHECK (
    "slot_granularity_minutes" >= 15
    AND "slot_granularity_minutes" <= 180
    AND "slot_granularity_minutes" % 15 = 0
  );

-- ═══════════════════════════════════════════════════════════
-- KlubConfig: extension mode
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."klub_configs"
  ADD COLUMN "extension_mode" TEXT NOT NULL DEFAULT 'disabled';

-- ═══════════════════════════════════════════════════════════
-- Booking: match type (nullable, backward compat) + extensions history
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "booking"."bookings"
  ADD COLUMN "match_type" TEXT,
  ADD COLUMN "extensions" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Index pra queries por matchType
CREATE INDEX "bookings_match_type_idx"
  ON "booking"."bookings"("match_type")
  WHERE "match_type" IS NOT NULL;
