-- Sprint Polish PR-J1 — reestruturação de roles.
--
-- Mapeamento:
--   SUPER_ADMIN  → PLATFORM_OWNER (oldest by granted_at) + PLATFORM_ADMIN (others)
--   STAFF        → SPORT_STAFF
--   SPORTS_COMMITTEE → SPORT_COMMISSION
--   TEACHER      → DELETE (removed; will be redesigned later)
--   KLUB_ADMIN   → KLUB_ADMIN (singleton por Klub: oldest stays, demais → KLUB_ASSISTANT)
--
-- Sem hardcode de email — Owner é determinístico pelo grant mais antigo.
-- Futuro: transferência via UI (PR-J2).

-- 1. PLATFORM_OWNER: o SUPER_ADMIN mais antigo (oldest granted_at). Demais
--    SUPER_ADMINs (raro/zero) viram PLATFORM_ADMIN.
WITH oldest AS (
  SELECT id FROM identity.role_assignments
  WHERE role = 'SUPER_ADMIN'
  ORDER BY granted_at ASC
  LIMIT 1
)
UPDATE identity.role_assignments
SET role = CASE
  WHEN id IN (SELECT id FROM oldest) THEN 'PLATFORM_OWNER'
  ELSE 'PLATFORM_ADMIN'
END
WHERE role = 'SUPER_ADMIN';

-- 2. Renames simples.
UPDATE identity.role_assignments SET role = 'SPORT_STAFF'      WHERE role = 'STAFF';
UPDATE identity.role_assignments SET role = 'SPORT_COMMISSION' WHERE role = 'SPORTS_COMMITTEE';

-- 3. TEACHER removido — será redesenhado no futuro.
DELETE FROM identity.role_assignments WHERE role = 'TEACHER';

-- 4. KLUB_ADMIN singleton: se houver >1 por Klub, manter o mais antigo;
--    demote os demais pra KLUB_ASSISTANT.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY scope_klub_id ORDER BY granted_at ASC) AS rn
  FROM identity.role_assignments
  WHERE role = 'KLUB_ADMIN' AND scope_klub_id IS NOT NULL
)
UPDATE identity.role_assignments
SET role = 'KLUB_ASSISTANT'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 5. Constraints:
-- 5a. Singleton PLATFORM_OWNER (max 1 row na tabela).
CREATE UNIQUE INDEX role_assignments_platform_owner_singleton
  ON identity.role_assignments ((role))
  WHERE role = 'PLATFORM_OWNER';

-- 5b. Singleton KLUB_ADMIN por Klub.
CREATE UNIQUE INDEX role_assignments_klub_admin_per_klub
  ON identity.role_assignments (scope_klub_id)
  WHERE role = 'KLUB_ADMIN' AND scope_klub_id IS NOT NULL;

-- Quota max 3 PLATFORM_ADMIN é validada app-level (Postgres não tem
-- count constraint elegante). Validação no handler quando UI de
-- granting for adicionada (PR-J2).
