-- ═══════════════════════════════════════════════════════════
-- Tournament: formatos + idempotência de pontos
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."tournaments"
  ADD COLUMN "tie_break_rule" JSONB DEFAULT '["wins","head_to_head","set_diff","game_diff"]'::jsonb,
  ADD COLUMN "groups_config" JSONB,
  ADD COLUMN "points_applied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "points_applied_at" TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- KlubSportRanking: flags configuráveis + janela temporal
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."klub_sport_rankings"
  ADD COLUMN "includes_casual_matches" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "includes_tournament_matches" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "includes_tournament_points" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "order_by" TEXT NOT NULL DEFAULT 'rating',
  ADD COLUMN "combined_weight" JSONB,
  ADD COLUMN "window_type" TEXT NOT NULL DEFAULT 'all_time',
  ADD COLUMN "window_size" INTEGER,
  ADD COLUMN "window_start_date" TIMESTAMPTZ;

CREATE INDEX "klub_sport_rankings_window_type_idx"
  ON "klub"."klub_sport_rankings"("window_type")
  WHERE "window_type" != 'all_time';

-- ═══════════════════════════════════════════════════════════
-- PlayerRankingEntry: pontos de torneio
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."player_ranking_entries"
  ADD COLUMN "tournament_points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_tournament_applied_at" TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- TournamentMatch: agenda (spaceId + warning)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE "klub"."tournament_matches"
  ADD COLUMN "space_id" UUID,
  ADD COLUMN "schedule_warning" TEXT;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "space"."spaces"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tournament_matches_scheduled_for_idx"
  ON "klub"."tournament_matches"("scheduled_for")
  WHERE "scheduled_for" IS NOT NULL;
