-- Sprint Polish PR-G: campos opcionais pra UI compacta + busca informal.
-- abbreviation: até 10 chars (ex: "PAC" pra Paissandu Atletico Clube).
-- common_name:  até 100 chars (nome popular, ex: "Paissandú").
ALTER TABLE "klub"."klubs"
  ADD COLUMN "abbreviation" VARCHAR(10),
  ADD COLUMN "common_name"  VARCHAR(100);
