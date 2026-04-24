-- CreateTable klub.ranking_points_schemas
CREATE TABLE "klub"."ranking_points_schemas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_sport_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ranking_points_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable klub.tournaments
CREATE TABLE "klub"."tournaments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_sport_id" UUID NOT NULL,
    "ranking_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "format" TEXT NOT NULL DEFAULT 'knockout',
    "has_prequalifiers" BOOLEAN NOT NULL DEFAULT false,
    "prequalifier_borders_per_frontier" INTEGER,
    "registration_approval" TEXT NOT NULL DEFAULT 'auto',
    "registration_fee" DECIMAL(10,2),
    "registration_opens_at" TIMESTAMPTZ NOT NULL,
    "registration_closes_at" TIMESTAMPTZ NOT NULL,
    "draw_date" TIMESTAMPTZ NOT NULL,
    "prequalifier_start_date" TIMESTAMPTZ,
    "prequalifier_end_date" TIMESTAMPTZ,
    "main_start_date" TIMESTAMPTZ NOT NULL,
    "main_end_date" TIMESTAMPTZ,
    "schedule_config" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "current_phase" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable klub.tournament_categories
CREATE TABLE "klub"."tournament_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "max_players" INTEGER,
    "min_rating_expected" INTEGER,
    "max_rating_expected" INTEGER,
    "points_schema_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable klub.tournament_entries
CREATE TABLE "klub"."tournament_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending_seeding',
    "final_position" TEXT,
    "rating_at_entry" INTEGER,
    "category_source" TEXT NOT NULL DEFAULT 'auto',
    "is_wild_card" BOOLEAN NOT NULL DEFAULT false,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "seeded_at" TIMESTAMPTZ,
    "moved_by_id" UUID,
    "withdrawn_at" TIMESTAMPTZ,
    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_categories_tournament_id_name_key"
  ON "klub"."tournament_categories"("tournament_id", "name");

CREATE UNIQUE INDEX "tournament_categories_tournament_id_order_key"
  ON "klub"."tournament_categories"("tournament_id", "order");

CREATE UNIQUE INDEX "tournament_entries_tournament_id_user_id_key"
  ON "klub"."tournament_entries"("tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "klub"."ranking_points_schemas"
  ADD CONSTRAINT "ranking_points_schemas_klub_sport_id_fkey"
  FOREIGN KEY ("klub_sport_id") REFERENCES "klub"."klub_sport_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournaments"
  ADD CONSTRAINT "tournaments_klub_sport_id_fkey"
  FOREIGN KEY ("klub_sport_id") REFERENCES "klub"."klub_sport_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournaments"
  ADD CONSTRAINT "tournaments_ranking_id_fkey"
  FOREIGN KEY ("ranking_id") REFERENCES "klub"."klub_sport_rankings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_categories"
  ADD CONSTRAINT "tournament_categories_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "klub"."tournaments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_categories"
  ADD CONSTRAINT "tournament_categories_points_schema_id_fkey"
  FOREIGN KEY ("points_schema_id") REFERENCES "klub"."ranking_points_schemas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_entries"
  ADD CONSTRAINT "tournament_entries_tournament_id_fkey"
  FOREIGN KEY ("tournament_id") REFERENCES "klub"."tournaments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_entries"
  ADD CONSTRAINT "tournament_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_entries"
  ADD CONSTRAINT "tournament_entries_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "klub"."tournament_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
