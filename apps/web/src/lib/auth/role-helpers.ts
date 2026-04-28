import type { Role } from '@draftklub/shared-types';

/**
 * Sprint Polish PR-J1 — utilitários de classificação de role pro frontend.
 * Mesma semântica do backend (apps/api/src/shared/auth/role-helpers.ts).
 */

export function isPlatformLevel(role: Role): boolean {
  return role === 'PLATFORM_OWNER' || role === 'PLATFORM_ADMIN';
}

export function isKlubLevel(role: Role): boolean {
  return role === 'KLUB_ADMIN' || role === 'KLUB_ASSISTANT';
}

export function isSportLevel(role: Role): boolean {
  return role === 'SPORT_COMMISSION' || role === 'SPORT_STAFF';
}

export function isPlatformOwner(role: Role): boolean {
  return role === 'PLATFORM_OWNER';
}

export function isKlubAdminOrAssistant(role: string | null | undefined): boolean {
  return role === 'KLUB_ADMIN' || role === 'KLUB_ASSISTANT';
}
