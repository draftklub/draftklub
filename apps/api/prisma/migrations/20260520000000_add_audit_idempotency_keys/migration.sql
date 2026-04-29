-- Sprint N batch 3 — Idempotency-Key cache pra mutações.
--
-- Padrão Stripe: cliente envia `Idempotency-Key: <uuid>` em POST/PATCH/
-- DELETE. Backend cacheia (status, body) por 24h scoped por user. Retry
-- com mesma key + payload retorna response cached. Retry com mesma key
-- + payload diferente retorna 422 idempotency_conflict.
--
-- Crítico pra mobile com rede instável — sem isso, retry de booking
-- duplica a reserva, retry de role grant cria 2 grants, etc.
--
-- TTL de 24h cobre cenário típico (cliente desiste de retry após 24h).
-- Cron de cleanup roda diariamente removendo expired (worker job).

CREATE TABLE "audit"."idempotency_keys" (
  "key"           TEXT NOT NULL,
  "user_id"       UUID NOT NULL,
  "method"        TEXT NOT NULL,
  "path"          TEXT NOT NULL,
  "request_hash"  TEXT NOT NULL,
  "status_code"   INTEGER NOT NULL,
  "response_body" JSONB NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at"    TIMESTAMPTZ NOT NULL,

  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("user_id", "key")
);

-- Index pra cleanup cron (DELETE WHERE expires_at < NOW())
CREATE INDEX "idempotency_keys_expires_at_idx"
  ON "audit"."idempotency_keys" ("expires_at");
