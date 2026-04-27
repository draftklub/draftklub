-- Sprint C PR1 — MembershipRequest pra Klubs com accessMode='private'
-- User submete request com mensagem (ex: nº de matrícula); KLUB_ADMIN
-- aprova/rejeita. Aprovação cria Membership + RoleAssignment PLAYER.

CREATE TABLE "klub"."membership_requests" (
  "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "klub_id"          UUID         NOT NULL,
  "user_id"          UUID         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'pending',
                                  -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  "message"          TEXT         NOT NULL,
  -- Mensagem livre escrita pelo solicitante (ex: "Sou sócio nº 12345").
  "attachment_url"   TEXT,
  -- URL opcional de comprovante. PR2 trará upload via Firebase Storage;
  -- PR1 aceita texto/URL livre pra começar.
  "decision_at"      TIMESTAMPTZ,
  "decided_by_id"    UUID,
  "rejection_reason" TEXT,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "fk_membership_requests_klub"
    FOREIGN KEY ("klub_id") REFERENCES "klub"."klubs"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_membership_requests_user"
    FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id"),
  CONSTRAINT "fk_membership_requests_decided_by"
    FOREIGN KEY ("decided_by_id") REFERENCES "identity"."users"("id")
);

-- Index pra fila do admin (lista pendentes por Klub ordenado por data).
CREATE INDEX "idx_membership_requests_klub_pending"
  ON "klub"."membership_requests" ("klub_id", "created_at" DESC)
  WHERE "status" = 'pending';

-- Index pra "minhas solicitações" (lista por user).
CREATE INDEX "idx_membership_requests_user"
  ON "klub"."membership_requests" ("user_id", "created_at" DESC);

-- Evita request duplicada pendente do mesmo user no mesmo Klub. User
-- pode ter histórico de várias requests rejected/cancelled mas só uma
-- pendente por vez.
CREATE UNIQUE INDEX "uq_membership_requests_one_pending_per_klub_user"
  ON "klub"."membership_requests" ("klub_id", "user_id")
  WHERE "status" = 'pending';
