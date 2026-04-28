import { z } from 'zod';

/**
 * Sprint Polish PR-J2 — DTOs pra grant/revoke de roles via UI.
 *
 * Granting é feito por email pra evitar precisar UI de busca de user;
 * o backend resolve email → userId. Email não encontrado → NotFound.
 */

export const GrantPlatformRoleSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type GrantPlatformRoleDto = z.infer<typeof GrantPlatformRoleSchema>;

export const KlubScopedRoleSchema = z.enum(['KLUB_ASSISTANT', 'SPORT_COMMISSION', 'SPORT_STAFF']);
export type KlubScopedRole = z.infer<typeof KlubScopedRoleSchema>;

export const GrantKlubRoleSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: KlubScopedRoleSchema,
  scopeSportId: z.string().uuid().optional(),
});
export type GrantKlubRoleDto = z.infer<typeof GrantKlubRoleSchema>;

/** Sprint Polish PR-J3 — DTO da transferência de KLUB_ADMIN. */
export const TransferKlubAdminSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type TransferKlubAdminDto = z.infer<typeof TransferKlubAdminSchema>;
