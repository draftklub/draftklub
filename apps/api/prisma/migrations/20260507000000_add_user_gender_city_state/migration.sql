-- Identity / User: campos de identidade nivel 1
-- Adiciona gender, city, state pra suporte ao /perfil basico.
-- Schema Prisma ja tem phone, birthDate, avatarUrl, documentNumber/Type
-- ha tempos; estes 3 fechavam a lacuna da identidade nivel 1.

ALTER TABLE "identity"."users"
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" CHAR(2);
