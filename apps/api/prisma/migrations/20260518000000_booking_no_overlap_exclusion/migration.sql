-- Sprint M batch 3 — EXCLUDE constraint pra prevenir double-booking
-- permanentemente, fechando a janela TOCTOU do conflict-check app-side
-- (que rodava ANTES do $transaction em create-booking.handler).
--
-- btree_gist habilita uso de operador `=` em coluna não-range (space_id)
-- dentro do mesmo EXCLUDE com tstzrange. Extension padrão Postgres,
-- idempotente.
--
-- O range é meio-aberto `[)`: ends_at é exclusivo. Logo bookings
-- 10:00–11:00 e 11:00–12:00 não conflitam (toque, não sobreposição).
--
-- Filtro WHERE: só blocos `pending` ou `confirmed` ainda ativos
-- (deleted_at IS NULL) ocupam slot. Cancelados, no-shows, completados
-- e soft-deletados liberam o horário.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "booking"."bookings"
ADD CONSTRAINT "bookings_no_space_overlap"
EXCLUDE USING gist (
  "space_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
)
WHERE (
  "status" IN ('pending', 'confirmed')
  AND "deleted_at" IS NULL
);
