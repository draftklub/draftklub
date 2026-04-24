-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "klub";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "space";

-- CreateTable
CREATE TABLE "klub"."klubs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar_url" TEXT,
    "cover_url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'sports_club',
    "entity_type" TEXT,
    "document_encrypted" TEXT,
    "document_hint" TEXT,
    "document_iv" TEXT,
    "legal_name" TEXT,
    "kyc_status" TEXT NOT NULL DEFAULT 'pending',
    "country" TEXT NOT NULL DEFAULT 'BR',
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "zip_code" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '{}',
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "status" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMPTZ,
    "max_members" INTEGER NOT NULL DEFAULT 50,
    "max_sports" INTEGER NOT NULL DEFAULT 2,
    "max_courts" INTEGER NOT NULL DEFAULT 3,
    "tx_fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.025,
    "parent_klub_id" UUID,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "billing_klub_id" UUID,
    "onboarding_source" TEXT NOT NULL DEFAULT 'self_service',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "klubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klub"."klub_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "booking_policy" TEXT NOT NULL DEFAULT 'members_only',
    "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24,
    "cancellation_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "no_show_fee_enabled" BOOLEAN NOT NULL DEFAULT false,
    "no_show_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gateway_account_id" TEXT,
    "opening_hour" INTEGER NOT NULL DEFAULT 6,
    "closing_hour" INTEGER NOT NULL DEFAULT 23,
    "open_days" TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',

    CONSTRAINT "klub_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klub"."klub_sports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "sport_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "klub_sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klub"."klub_sport_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "sport_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "klub_sport_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klub"."klub_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sports_club',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "sport_codes" TEXT[],
    "estimated_members" INTEGER,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "converted_klub_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by_id" UUID,

    CONSTRAINT "klub_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klub"."klub_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "klub_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space"."spaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "klub_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'court',
    "sport_code" TEXT,
    "surface" TEXT,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "has_lighting" BOOLEAN NOT NULL DEFAULT false,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "description" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "klubs_slug_key" ON "klub"."klubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "klub_configs_klub_id_key" ON "klub"."klub_configs"("klub_id");

-- CreateIndex
CREATE UNIQUE INDEX "klub_sports_klub_id_sport_code_key" ON "klub"."klub_sports"("klub_id", "sport_code");

-- AddForeignKey
ALTER TABLE "identity"."memberships" ADD CONSTRAINT "memberships_klub_id_fkey" FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klub"."klub_configs" ADD CONSTRAINT "klub_configs_klub_id_fkey" FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klub"."klub_sports" ADD CONSTRAINT "klub_sports_klub_id_fkey" FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klub"."klub_sport_interests" ADD CONSTRAINT "klub_sport_interests_klub_id_fkey" FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klub"."klub_media" ADD CONSTRAINT "klub_media_klub_id_fkey" FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
