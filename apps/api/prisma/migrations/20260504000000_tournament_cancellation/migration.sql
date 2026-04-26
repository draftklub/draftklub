-- ═══════════════════════════════════════════════════════════
-- Tournament: campos de cancelamento (W2.2)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."tournaments"
  ADD COLUMN "cancelled_at" TIMESTAMPTZ,
  ADD COLUMN "cancelled_by_id" UUID,
  ADD COLUMN "cancellation_reason" TEXT;
