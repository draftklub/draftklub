-- DB-2: Campos de auditoria em todas as tabelas
-- Adiciona createdAt/updatedAt onde faltam, e createdById/updatedById
-- em todos os modelos operacionais mutáveis.

-- ─── identity schema ──────────────────────────────────────────────────────────

ALTER TABLE "identity"."memberships"
  ADD COLUMN "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "created_by_id" UUID;

ALTER TABLE "identity"."role_assignments"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── klub schema ──────────────────────────────────────────────────────────────

ALTER TABLE "klub"."klubs"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."klub_configs"
  ADD COLUMN "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."klub_sport_profiles"
  ADD COLUMN "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."klub_sport_rankings"
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."player_ranking_entries"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE "klub"."klub_media"
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE "klub"."ranking_points_schemas"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."tournaments"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."tournament_categories"
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."tournament_matches"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "klub"."tournament_entries"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── space schema ─────────────────────────────────────────────────────────────

ALTER TABLE "space"."spaces"
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;

-- ─── booking schema ───────────────────────────────────────────────────────────

ALTER TABLE "booking"."bookings"
  ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "booking"."booking_series"
  ADD COLUMN "updated_by_id" UUID;
