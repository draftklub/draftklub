-- ═══════════════════════════════════════════════════════════
-- Schema booking
-- ═══════════════════════════════════════════════════════════
CREATE SCHEMA IF NOT EXISTS "booking";

-- ═══════════════════════════════════════════════════════════
-- KlubConfig: refatora bookingPolicy → granular
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."klub_configs"
  ADD COLUMN "access_mode" TEXT NOT NULL DEFAULT 'members_only',
  ADD COLUMN "booking_modes" JSONB NOT NULL DEFAULT '["direct"]'::jsonb,
  ADD COLUMN "cancellation_mode" TEXT NOT NULL DEFAULT 'with_deadline',
  ADD COLUMN "agenda_visibility" TEXT NOT NULL DEFAULT 'public';

-- Backfill access_mode baseado em bookingPolicy legacy
UPDATE "klub"."klub_configs"
SET "access_mode" = CASE
  WHEN "booking_policy" = 'public' THEN 'public'
  ELSE 'members_only'
END;

-- ═══════════════════════════════════════════════════════════
-- Space: slot config
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "space"."spaces"
  ADD COLUMN "slot_granularity_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "slot_default_duration_minutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "booking_active" BOOLEAN NOT NULL DEFAULT true;

-- ═══════════════════════════════════════════════════════════
-- Booking: novo model
-- ═══════════════════════════════════════════════════════════
CREATE TABLE "booking"."bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "booking_type" TEXT NOT NULL DEFAULT 'player_match',
    "creation_mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "primary_player_id" UUID,
    "other_players" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "tournament_match_id" UUID,
    "created_by_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_tournament_match_id_key"
  ON "booking"."bookings"("tournament_match_id")
  WHERE "tournament_match_id" IS NOT NULL;

CREATE INDEX "bookings_klub_id_starts_at_idx"
  ON "booking"."bookings"("klub_id", "starts_at");

CREATE INDEX "bookings_space_id_starts_at_idx"
  ON "booking"."bookings"("space_id", "starts_at");

CREATE INDEX "bookings_primary_player_id_starts_at_idx"
  ON "booking"."bookings"("primary_player_id", "starts_at")
  WHERE "primary_player_id" IS NOT NULL;

CREATE INDEX "bookings_status_idx"
  ON "booking"."bookings"("status");

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "space"."spaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_tournament_match_id_fkey"
  FOREIGN KEY ("tournament_match_id") REFERENCES "klub"."tournament_matches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
