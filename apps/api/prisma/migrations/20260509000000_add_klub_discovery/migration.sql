-- Klub: discovery + privacy + geo (future-proof pra Sprints B+1..B+3)
--
-- discoverable: opt-in pra aparecer em GET /klubs/discover. Default
--   false — Klubs existentes ficam privados sem mudanca.
-- access_mode: 'public' (qualquer auth user pode entrar via
--   join_via_link) | 'private' (precisa MembershipRequest, ativa em
--   Sprint C). Sprint B aceita os 2 valores no /criar-klub mas o
--   comportamento real de private (queue de aprovacao) entra em
--   Sprint C.
-- latitude/longitude: populados em Sprint B+1 via geocoding CEP.
-- cep: source pra geocoding; nao tinhamos CEP no Klub ate agora.

-- latitude/longitude ja existem em klubs (decimal); Sprint B so adiciona
-- discoverable + access_mode + cep.
ALTER TABLE "klub"."klubs"
  ADD COLUMN "discoverable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "access_mode" TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN "cep" CHAR(8);

-- Indice parcial pro endpoint /klubs/discover: maioria dos Klubs sera
-- discoverable=false, indice cobre so o subset relevante.
CREATE INDEX "klubs_discoverable_status_idx"
  ON "klub"."klubs" ("status", "name")
  WHERE "discoverable" = true AND "deleted_at" IS NULL;
