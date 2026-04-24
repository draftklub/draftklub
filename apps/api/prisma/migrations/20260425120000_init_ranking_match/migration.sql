-- CreateTable klub.klub_sport_rankings
CREATE TABLE "klub"."klub_sport_rankings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_sport_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'singles',
    "gender" TEXT,
    "age_min" INTEGER,
    "age_max" INTEGER,
    "rating_engine" TEXT NOT NULL DEFAULT 'elo',
    "rating_config" JSONB NOT NULL DEFAULT '{}',
    "initial_rating" INTEGER NOT NULL DEFAULT 1000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "season_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "klub_sport_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable klub.player_ranking_entries
CREATE TABLE "klub"."player_ranking_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ranking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "rating_source" TEXT NOT NULL DEFAULT 'initial',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMPTZ,
    "last_rating_change" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_ranking_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable klub.match_results
CREATE TABLE "klub"."match_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ranking_id" UUID NOT NULL,
    "player1_id" UUID NOT NULL,
    "player2_id" UUID NOT NULL,
    "winner_id" UUID,
    "score" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_confirmation',
    "submitted_by_id" UUID NOT NULL,
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "validated_by_id" UUID,
    "validated_at" TIMESTAMPTZ,
    "dispute_reason" TEXT,
    "player1_rating_before" INTEGER,
    "player2_rating_before" INTEGER,
    "player1_rating_after" INTEGER,
    "player2_rating_after" INTEGER,
    "rating_delta1" INTEGER,
    "rating_delta2" INTEGER,
    "played_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "space_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_ranking_entries_ranking_id_user_id_key"
  ON "klub"."player_ranking_entries"("ranking_id", "user_id");

-- AddForeignKey
ALTER TABLE "klub"."klub_sport_rankings"
  ADD CONSTRAINT "klub_sport_rankings_klub_sport_id_fkey"
  FOREIGN KEY ("klub_sport_id") REFERENCES "klub"."klub_sport_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."player_ranking_entries"
  ADD CONSTRAINT "player_ranking_entries_ranking_id_fkey"
  FOREIGN KEY ("ranking_id") REFERENCES "klub"."klub_sport_rankings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."player_ranking_entries"
  ADD CONSTRAINT "player_ranking_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."match_results"
  ADD CONSTRAINT "match_results_ranking_id_fkey"
  FOREIGN KEY ("ranking_id") REFERENCES "klub"."klub_sport_rankings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."match_results"
  ADD CONSTRAINT "match_results_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id") REFERENCES "identity"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
