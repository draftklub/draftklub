-- User: lat/lng (Sprint B+1)
-- Populados via geocoding do CEP do user (BrasilAPI v2). Fallback pra
-- "próximos a mim" no /buscar-klubs quando o user nega permissão de
-- geolocation no browser.

ALTER TABLE "identity"."users"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION;
