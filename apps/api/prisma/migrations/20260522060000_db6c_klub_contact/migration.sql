-- DB-6c: extrai campos de contato/localização do god-aggregate Klub
-- para tabela 1:1 klub.klub_contact
CREATE TABLE "klub"."klub_contact" (
  "id"                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  "klub_id"              UUID        NOT NULL,
  "country"              TEXT        NOT NULL DEFAULT 'BR',
  "state"                TEXT,
  "city"                 TEXT,
  "address"              TEXT,
  "zip_code"             TEXT,
  "cep"                  CHAR(8),
  "timezone"             TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
  "latitude"             DECIMAL(10,8),
  "longitude"            DECIMAL(11,8),
  "address_street"       TEXT,
  "address_number"       TEXT,
  "address_complement"   TEXT,
  "address_neighborhood" TEXT,
  "address_source"       TEXT,
  "email"                TEXT,
  "phone"                TEXT,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "klub_contact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "klub_contact_klub_id_key" UNIQUE ("klub_id"),
  CONSTRAINT "klub_contact_klub_id_fkey" FOREIGN KEY ("klub_id")
    REFERENCES "klub"."klubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "klub"."klub_contact" (
  "klub_id", "country", "state", "city", "address", "zip_code", "cep", "timezone",
  "latitude", "longitude", "address_street", "address_number", "address_complement",
  "address_neighborhood", "address_source", "email", "phone"
)
SELECT
  "id", "country", "state", "city", "address", "zip_code", "cep", "timezone",
  "latitude", "longitude", "address_street", "address_number", "address_complement",
  "address_neighborhood", "address_source", "email", "phone"
FROM "klub"."klubs";

ALTER TABLE "klub"."klubs"
  DROP COLUMN "country",
  DROP COLUMN "state",
  DROP COLUMN "city",
  DROP COLUMN "address",
  DROP COLUMN "zip_code",
  DROP COLUMN "cep",
  DROP COLUMN "timezone",
  DROP COLUMN "latitude",
  DROP COLUMN "longitude",
  DROP COLUMN "address_street",
  DROP COLUMN "address_number",
  DROP COLUMN "address_complement",
  DROP COLUMN "address_neighborhood",
  DROP COLUMN "address_source",
  DROP COLUMN "email",
  DROP COLUMN "phone";
