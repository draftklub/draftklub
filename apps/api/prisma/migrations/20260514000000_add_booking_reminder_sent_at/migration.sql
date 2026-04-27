-- Sprint Polish PR-A — Booking reminder 24h
--
-- Adiciona timestamp pra evitar reenvio de lembrete. Cron escaneia
-- bookings em [now+23h, now+25h] com reminderSentAt IS NULL,
-- emite OutboxEvent klub.booking.reminder_24h e atualiza este campo
-- atomicamente.

ALTER TABLE "booking"."bookings"
  ADD COLUMN "reminder_sent_at" TIMESTAMPTZ;

-- Index parcial pra acelerar a query do cron (só procura quem ainda
-- não recebeu lembrete, em status 'confirmed').
CREATE INDEX "idx_bookings_reminder_pending"
  ON "booking"."bookings" ("starts_at")
  WHERE "reminder_sent_at" IS NULL AND "status" = 'confirmed';
