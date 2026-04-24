-- CreateTable klub.tournament_matches
CREATE TABLE "klub"."tournament_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "phase" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "bracket_position" TEXT NOT NULL,
    "slot_top" INTEGER NOT NULL,
    "slot_bottom" INTEGER NOT NULL,
    "player1_id" UUID,
    "player2_id" UUID,
    "seed1" INTEGER,
    "seed2" INTEGER,
    "is_bye" BOOLEAN NOT NULL DEFAULT false,
    "next_match_id" UUID,
    "next_match_slot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winner_id" UUID,
    "match_result_id" UUID,
    "scheduled_for" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_matches_tournament_id_bracket_position_key"
  ON "klub"."tournament_matches"("tournament_id", "bracket_position");

CREATE UNIQUE INDEX "tournament_matches_match_result_id_key"
  ON "klub"."tournament_matches"("match_result_id");

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "klub"."tournaments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "klub"."tournament_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_next_match_id_fkey"
  FOREIGN KEY ("next_match_id") REFERENCES "klub"."tournament_matches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend tournaments with result_reporting_mode
ALTER TABLE "klub"."tournaments"
  ADD COLUMN "result_reporting_mode" TEXT NOT NULL DEFAULT 'committee_only';

-- Extend match_results
ALTER TABLE "klub"."match_results"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'casual',
  ADD COLUMN "tournament_id" UUID,
  ADD COLUMN "tournament_match_id" UUID,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "bracket_position" TEXT,
  ADD COLUMN "is_walkover" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "match_results_tournament_id_idx"
  ON "klub"."match_results"("tournament_id");

CREATE INDEX "match_results_source_idx"
  ON "klub"."match_results"("source");

ALTER TABLE "klub"."match_results"
  ADD CONSTRAINT "match_results_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "klub"."tournaments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_match_result_id_fkey"
  FOREIGN KEY ("match_result_id") REFERENCES "klub"."match_results"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
