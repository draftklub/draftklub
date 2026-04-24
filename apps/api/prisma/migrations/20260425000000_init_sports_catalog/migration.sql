-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sports";

-- CreateTable sports.catalog
CREATE TABLE "sports"."catalog" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "play_type" TEXT NOT NULL DEFAULT 'both',
    "min_players" INTEGER NOT NULL DEFAULT 2,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "icon_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_pkey" PRIMARY KEY ("code")
);

-- Seed sports catalog
INSERT INTO "sports"."catalog" ("code", "name", "description", "play_type", "min_players", "max_players", "sort_order") VALUES
('tennis',       'Tênis',       'Tênis de campo — simples e duplas',         'both',    2, 4, 1),
('squash',       'Squash',      'Squash — jogo individual em quadra fechada', 'singles', 2, 2, 2),
('padel',        'Padel',       'Padel — sempre em duplas',                   'doubles', 4, 4, 3),
('beach_tennis', 'Beach Tênis', 'Beach Tênis — duplas na areia',              'doubles', 4, 4, 4);

-- CreateTable sports.rating_engines
CREATE TABLE "sports"."rating_engines" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config_schema" JSONB NOT NULL,
    "default_config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "rating_engines_pkey" PRIMARY KEY ("code")
);

-- Seed rating engines
INSERT INTO "sports"."rating_engines" ("code", "name", "description", "config_schema", "default_config") VALUES
(
  'elo',
  'ELO Clássico',
  'Sistema ELO adaptado para racket sports. Rating sobe/desce baseado no resultado vs adversário e na diferença de ratings.',
  '{"kFactor": {"type": "number", "default": 32, "description": "Fator K padrão (abaixo do threshold)"}, "kFactorHigh": {"type": "number", "default": 16, "description": "Fator K para ratings altos"}, "kThreshold": {"type": "number", "default": 1400, "description": "Rating a partir do qual usa kFactorHigh"}, "initialRating": {"type": "number", "default": 1000}}',
  '{"kFactor": 32, "kFactorHigh": 16, "kThreshold": 1400, "initialRating": 1000}'
),
(
  'points',
  'Pontos por Torneio',
  'Jogadores acumulam pontos baseado na posição final em torneios. Estilo ATP/WTA.',
  '{"champion": {"type": "number", "default": 100}, "runnerUp": {"type": "number", "default": 70}, "semi": {"type": "number", "default": 40}, "quarter": {"type": "number", "default": 20}, "roundOf16": {"type": "number", "default": 10}, "topN": {"type": "number", "default": 4, "description": "Considera os melhores N torneios do período"}}',
  '{"champion": 100, "runnerUp": 70, "semi": 40, "quarter": 20, "roundOf16": 10, "topN": 4}'
),
(
  'win_loss',
  'Vitórias e Derrotas',
  'Sistema simples baseado em W/L com decay por inatividade. Bom para squash e sports com partidas frequentes.',
  '{"win": {"type": "number", "default": 25}, "loss": {"type": "number", "default": -10}, "decayPerWeek": {"type": "number", "default": -5, "description": "Pontos perdidos por semana sem jogar"}, "minRating": {"type": "number", "default": 0}}',
  '{"win": 25, "loss": -10, "decayPerWeek": -5, "minRating": 0}'
);

-- CreateTable klub.klub_sport_profiles
CREATE TABLE "klub"."klub_sport_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "sport_code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "default_rating_engine" TEXT NOT NULL DEFAULT 'elo',
    "default_rating_config" JSONB NOT NULL DEFAULT '{}',
    "default_initial_rating" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'active',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by_id" UUID,
    CONSTRAINT "klub_sport_profiles_pkey" PRIMARY KEY ("id")
);

-- Migrate data from klub_sports to klub_sport_profiles
INSERT INTO "klub"."klub_sport_profiles" ("klub_id", "sport_code", "status", "added_at")
SELECT "klub_id", "sport_code", "status", "added_at"
FROM "klub"."klub_sports";

-- CreateIndex
CREATE UNIQUE INDEX "klub_sport_profiles_klub_id_sport_code_key"
  ON "klub"."klub_sport_profiles"("klub_id", "sport_code");

-- Drop old klub_sports
DROP TABLE IF EXISTS "klub"."klub_sports";

-- Drop and recreate klub_sport_interests (clean up)
DROP TABLE IF EXISTS "klub"."klub_sport_interests";
CREATE TABLE "klub"."klub_sport_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "sport_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "klub_sport_interests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "klub"."klub_sport_profiles"
  ADD CONSTRAINT "klub_sport_profiles_klub_id_fkey"
  FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_profiles"
  ADD CONSTRAINT "klub_sport_profiles_sport_code_fkey"
  FOREIGN KEY ("sport_code") REFERENCES "sports"."catalog"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_interests"
  ADD CONSTRAINT "klub_sport_interests_klub_id_fkey"
  FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
