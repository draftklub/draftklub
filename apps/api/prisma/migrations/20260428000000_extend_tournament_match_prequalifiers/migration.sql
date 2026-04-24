-- Extend tournament_matches with prequalifier + TBD slot fields
ALTER TABLE "klub"."tournament_matches"
  ADD COLUMN "match_kind" TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN "prequalifier_frontier_upper" TEXT,
  ADD COLUMN "prequalifier_frontier_lower" TEXT,
  ADD COLUMN "prequalifier_pair_index" INTEGER,
  ADD COLUMN "tbd_player1_source" TEXT,
  ADD COLUMN "tbd_player1_prequalifier_ref" UUID,
  ADD COLUMN "tbd_player1_label" TEXT,
  ADD COLUMN "tbd_player2_source" TEXT,
  ADD COLUMN "tbd_player2_prequalifier_ref" UUID,
  ADD COLUMN "tbd_player2_label" TEXT;

-- Index for fast prequalifier lookups
CREATE INDEX "tournament_matches_match_kind_idx"
  ON "klub"."tournament_matches"("match_kind");

CREATE INDEX "tournament_matches_prequalifier_frontiers_idx"
  ON "klub"."tournament_matches"("tournament_id", "prequalifier_frontier_upper", "prequalifier_frontier_lower")
  WHERE "match_kind" = 'prequalifier';

-- FKs for TBD slot refs (self-FK to tournament_matches)
ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_tbd_player1_prequalifier_ref_fkey"
  FOREIGN KEY ("tbd_player1_prequalifier_ref") REFERENCES "klub"."tournament_matches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_tbd_player2_prequalifier_ref_fkey"
  FOREIGN KEY ("tbd_player2_prequalifier_ref") REFERENCES "klub"."tournament_matches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
