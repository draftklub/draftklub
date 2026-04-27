-- User: notification preferences (PR-A7)
-- JSONB com toggles por tipo de notificação. Sprint atual só persiste;
-- mailer integration entra em Onda 3.
--
-- Shape canônico (defaults all true):
--   { "email": { "enrollment": true, "booking": true, "tournament": true,
--                "invitation": true, "announcement": true } }

ALTER TABLE "identity"."users"
  ADD COLUMN "notification_prefs" JSONB NOT NULL DEFAULT '{}'::jsonb;
