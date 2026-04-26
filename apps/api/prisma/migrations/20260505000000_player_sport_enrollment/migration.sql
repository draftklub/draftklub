-- ═══════════════════════════════════════════════════════════
-- PlayerSportEnrollment: User x KlubSportProfile (W2.3)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE "klub"."player_sport_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "klub_sport_profile_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "suspended_at" TIMESTAMPTZ,
    "suspended_by_id" UUID,
    "suspension_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_sport_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_sport_enrollments_user_klub_sport_unique"
  ON "klub"."player_sport_enrollments"("user_id", "klub_sport_profile_id");

CREATE INDEX "player_sport_enrollments_user_status_idx"
  ON "klub"."player_sport_enrollments"("user_id", "status");

CREATE INDEX "player_sport_enrollments_profile_status_idx"
  ON "klub"."player_sport_enrollments"("klub_sport_profile_id", "status");

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_profile_fkey"
  FOREIGN KEY ("klub_sport_profile_id") REFERENCES "klub"."klub_sport_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
