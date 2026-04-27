-- Identity / User: endereço estruturado pra cadastro transacional
-- (nota fiscal, correspondencia). Todos campos opcionais; populado
-- via PATCH /me com autofill ViaCEP no frontend.

ALTER TABLE "identity"."users"
  ADD COLUMN "cep" CHAR(8),
  ADD COLUMN "address_street" TEXT,
  ADD COLUMN "address_number" TEXT,
  ADD COLUMN "address_complement" TEXT,
  ADD COLUMN "address_neighborhood" TEXT;
