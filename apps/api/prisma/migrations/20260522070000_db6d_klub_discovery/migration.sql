-- DB-6d: extrai campos de discovery/visibilidade do god-aggregate Klub
CREATE TABLE "klub"."klub_discovery" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "klub_id"      UUID        NOT NULL,
  "description"  TEXT,
  "avatar_url"   TEXT,
  "cover_url"    TEXT,
  "website"      TEXT,
  "discoverable" BOOLEAN     NOT NULL DEFAULT FALSE,
  "access_mode"  TEXT        NOT NULL DEFAULT 'public',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "klub_discovery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "klub_discovery_klub_id_key" UNIQUE ("klub_id"),
  CONSTRAINT "klub_discovery_klub_id_fkey" FOREIGN KEY ("klub_id")
    REFERENCES "klub"."klubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "klub"."klub_discovery" (
  "klub_id", "description", "avatar_url", "cover_url", "website",
  "discoverable", "access_mode"
)
SELECT
  "id", "description", "avatar_url", "cover_url", "website",
  "discoverable", "access_mode"
FROM "klub"."klubs";

ALTER TABLE "klub"."klubs"
  DROP COLUMN "description",
  DROP COLUMN "avatar_url",
  DROP COLUMN "cover_url",
  DROP COLUMN "website",
  DROP COLUMN "discoverable",
  DROP COLUMN "access_mode";
