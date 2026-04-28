-- Sprint Grupo C — tabela de feature gates + audit trail.
--
-- features  → identity schema (controle de acesso de plataforma)
-- features_audit → audit schema (trilha de mudanças por admin)
--
-- Tier 'free'     → acessível a todos os usuários autenticados.
-- Tier 'premium'  → acessível a usuários de Klubs com plano pago (non-trial).
-- Tier 'disabled' → nenhum usuário tem acesso (independente de enabled).
--
-- updated_at é gerenciado pelo Prisma ORM (@updatedAt) — sem trigger SQL.

-- CreateTable
CREATE TABLE "identity"."features" (
    "id"           TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description"  TEXT,
    "tier"         TEXT NOT NULL DEFAULT 'free',
    "enabled"      BOOLEAN NOT NULL DEFAULT true,
    "rollout_pct"  INTEGER NOT NULL DEFAULT 100,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "features_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "features_tier_check" CHECK (tier IN ('free', 'premium', 'disabled')),
    CONSTRAINT "features_rollout_pct_check" CHECK (rollout_pct BETWEEN 0 AND 100)
);

-- CreateTable
CREATE TABLE "audit"."features_audit" (
    "id"         BIGSERIAL NOT NULL,
    "feature_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "field"      TEXT NOT NULL,
    "old_value"  TEXT,
    "new_value"  TEXT,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "features_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_features_audit_feature_id" ON "audit"."features_audit"("feature_id");

-- AddForeignKey
ALTER TABLE "audit"."features_audit"
    ADD CONSTRAINT "features_audit_feature_id_fkey"
    FOREIGN KEY ("feature_id") REFERENCES "identity"."features"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
