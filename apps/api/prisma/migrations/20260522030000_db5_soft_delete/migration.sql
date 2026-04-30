-- DB-5: Soft-delete consistency
-- Adiciona deleted_at nos modelos operacionais mutáveis que não tinham.
-- Partial index WHERE deleted_at IS NULL otimiza queries de registros ativos.

ALTER TABLE "identity"."memberships"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "identity"."role_assignments"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "klub"."klub_sport_profiles"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

ALTER TABLE "klub"."tournaments"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

CREATE INDEX "memberships_deleted_at_idx"
  ON "identity"."memberships"("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "role_assignments_deleted_at_idx"
  ON "identity"."role_assignments"("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "klub_sport_profiles_deleted_at_idx"
  ON "klub"."klub_sport_profiles"("deleted_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "tournaments_deleted_at_idx"
  ON "klub"."tournaments"("deleted_at")
  WHERE "deleted_at" IS NULL;
