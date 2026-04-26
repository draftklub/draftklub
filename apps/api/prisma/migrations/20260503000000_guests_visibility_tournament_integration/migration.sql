-- ═══════════════════════════════════════════════════════════
-- User: kind, document, firebaseUid nullable
-- (User.phone ja existe desde init_identity)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "identity"."users"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN "document_number" TEXT,
  ADD COLUMN "document_type" TEXT;

-- DROP NOT NULL eh metadata-only no Postgres (sem rewrite da tabela).
ALTER TABLE "identity"."users"
  ALTER COLUMN "firebase_uid" DROP NOT NULL;

CREATE INDEX "users_kind_idx"
  ON "identity"."users"("kind")
  WHERE "kind" = 'guest';

CREATE INDEX "users_document_number_idx"
  ON "identity"."users"("document_number")
  WHERE "document_number" IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- Booking: responsibleMemberId (nullable, backward compat)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "booking"."bookings"
  ADD COLUMN "responsible_member_id" UUID;

CREATE INDEX "bookings_responsible_member_idx"
  ON "booking"."bookings"("responsible_member_id")
  WHERE "responsible_member_id" IS NOT NULL;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_responsible_member_fkey"
  FOREIGN KEY ("responsible_member_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
-- KlubConfig: guests + tournament conflict mode
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."klub_configs"
  ADD COLUMN "guests_added_by" TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN "tournament_booking_conflict_mode" TEXT NOT NULL DEFAULT 'staff_decides';
