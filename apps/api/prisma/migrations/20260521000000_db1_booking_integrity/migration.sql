-- DB-1a: Booking.endsAt — coluna já é NOT NULL no DB; apenas alinha Prisma schema.
-- Nenhuma alteração SQL necessária pra ends_at.

-- DB-1b: Booking.klubId — adiciona FK constraint que estava ausente.
-- Garante integridade referencial entre booking.bookings e klub.klubs.
ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_klub_id_fkey"
  FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
