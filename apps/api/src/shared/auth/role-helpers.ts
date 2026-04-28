import type { Role } from '@draftklub/shared-types';

/**
 * Sprint Polish PR-J1 — utilitários de classificação de role.
 * Centralizam checks repetitivos pra evitar drift entre handlers.
 */

const PLATFORM_ROLES: ReadonlySet<Role> = new Set(['PLATFORM_OWNER', 'PLATFORM_ADMIN']);
const KLUB_ROLES: ReadonlySet<Role> = new Set(['KLUB_ADMIN', 'KLUB_ASSISTANT']);
const SPORT_ROLES: ReadonlySet<Role> = new Set(['SPORT_COMMISSION', 'SPORT_STAFF']);

export function isPlatformLevel(role: Role): boolean {
  return PLATFORM_ROLES.has(role);
}

export function isKlubLevel(role: Role): boolean {
  return KLUB_ROLES.has(role);
}

export function isSportLevel(role: Role): boolean {
  return SPORT_ROLES.has(role);
}

export function isPlatformOwner(role: Role): boolean {
  return role === 'PLATFORM_OWNER';
}

export function isKlubAdminOrAssistant(role: string | null | undefined): boolean {
  return role === 'KLUB_ADMIN' || role === 'KLUB_ASSISTANT';
}
