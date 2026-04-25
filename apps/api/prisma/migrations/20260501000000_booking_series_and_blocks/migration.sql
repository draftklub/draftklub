-- ═══════════════════════════════════════════════════════════
-- KlubConfig: limite de recorrência
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."klub_configs"
  ADD COLUMN "max_recurrence_months" INTEGER NOT NULL DEFAULT 3;

-- ═══════════════════════════════════════════════════════════
-- Booking: endsAt nullable + series FK + auto-cancel self-FK
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "booking"."bookings"
  ALTER COLUMN "ends_at" DROP NOT NULL;

ALTER TABLE "booking"."bookings"
  ADD COLUMN "booking_series_id" UUID,
  ADD COLUMN "auto_cancelled_by_booking_id" UUID;

CREATE INDEX "bookings_booking_series_id_idx"
  ON "booking"."bookings"("booking_series_id")
  WHERE "booking_series_id" IS NOT NULL;

CREATE INDEX "bookings_auto_cancelled_by_idx"
  ON "booking"."bookings"("auto_cancelled_by_booking_id")
  WHERE "auto_cancelled_by_booking_id" IS NOT NULL;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_auto_cancelled_by_fkey"
  FOREIGN KEY ("auto_cancelled_by_booking_id") REFERENCES "booking"."bookings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
-- BookingSeries: novo model
-- ═══════════════════════════════════════════════════════════
CREATE TABLE "booking"."booking_series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "days_of_week" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "starts_on" TIMESTAMPTZ NOT NULL,
    "ends_on" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL DEFAULT 0,
    "booking_type" TEXT NOT NULL DEFAULT 'player_match',
    "primary_player_id" UUID,
    "other_players" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by_id" UUID NOT NULL,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "booking_series_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_series_klub_id_starts_on_idx"
  ON "booking"."booking_series"("klub_id", "starts_on");

CREATE INDEX "booking_series_space_id_starts_on_idx"
  ON "booking"."booking_series"("space_id", "starts_on");

CREATE INDEX "booking_series_primary_player_id_idx"
  ON "booking"."booking_series"("primary_player_id")
  WHERE "primary_player_id" IS NOT NULL;

ALTER TABLE "booking"."booking_series"
  ADD CONSTRAINT "booking_series_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "space"."spaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_booking_series_id_fkey"
  FOREIGN KEY ("booking_series_id") REFERENCES "booking"."booking_series"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
