import type { Role } from '@draftklub/shared-types';

export interface ResourceContext {
  klubId?: string;
  sportId?: string;
  ownerId?: string;
  /**
   * Sprint Polish PR-J1 — quando a action é sobre roles (e.g.
   * `role.demote`, `role.transfer`), targetRole identifica a role
   * sendo manipulada. Permite regras como "PLATFORM_ADMIN não pode
   * demote outro PLATFORM_ADMIN".
   */
  targetRole?: Role;
}
