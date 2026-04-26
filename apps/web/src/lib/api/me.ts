import type { MeResponse, UserKlubMembership } from '@draftklub/shared-types';
import { apiFetch } from './client';

/** GET /me — identidade do user logado + roleAssignments. */
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me');
}

/**
 * GET /me/klubs — Klubs do user logado + role mais alta em cada um.
 * Usado pelo post-login router e pelo Klub switcher.
 */
export function getMyKlubs(): Promise<UserKlubMembership[]> {
  return apiFetch<UserKlubMembership[]>('/me/klubs');
}
