-- ═══════════════════════════════════════════════════════════
-- TournamentMatchRevert: audit log de reverts de resultado (W2.4)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE "klub"."tournament_match_reverts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_match_id" UUID NOT NULL,
    "reverted_by_id" UUID NOT NULL,
    "reverted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "previous_state" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_match_reverts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournament_match_reverts_match_idx"
  ON "klub"."tournament_match_reverts"("tournament_match_id");

CREATE INDEX "tournament_match_reverts_reverted_at_idx"
  ON "klub"."tournament_match_reverts"("reverted_at");

ALTER TABLE "klub"."tournament_match_reverts"
  ADD CONSTRAINT "tournament_match_reverts_match_fkey"
  FOREIGN KEY ("tournament_match_id") REFERENCES "klub"."tournament_matches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
