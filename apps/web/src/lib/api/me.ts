import type {
  DocumentType,
  Gender,
  MeResponse,
  NotificationPrefs,
  UserKlubMembership,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/** GET /me — identidade do user logado (Firebase + DB) + roleAssignments. */
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me');
}

/**
 * Body do PATCH /me — todos campos opcionais. Backend só atualiza
 * fields enviados (Prisma update parcial). State em maiúsculas (UF).
 * birthDate em ISO `YYYY-MM-DD`.
 */
export interface UpdateMeInput {
  fullName?: string;
  phone?: string;
  birthDate?: string;
  avatarUrl?: string;
  gender?: Gender;
  city?: string;
  state?: string;
  cep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  documentNumber?: string;
  documentType?: DocumentType;
  notificationPrefs?: NotificationPrefs;
}

/** PATCH /me — atualiza campos do user logado. */
export function updateMe(input: UpdateMeInput): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me', { method: 'PATCH', json: input });
}

/**
 * GET /me/klubs — Klubs do user logado + role mais alta em cada um.
 * Usado pelo post-login router e pelo Klub switcher.
 */
export function getMyKlubs(): Promise<UserKlubMembership[]> {
  return apiFetch<UserKlubMembership[]>('/me/klubs');
}

/**
 * Sprint M batch 8 — LGPD endpoints.
 */

/** Versão atual da política/termos. Bump quando alterar /privacidade. */
export const CURRENT_CONSENT_VERSION = '2026-04-29-v1';

/** POST /me/consent — registra aceite à versão atual da política. */
export function recordConsent(
  version: string = CURRENT_CONSENT_VERSION,
): Promise<{ consentGivenAt: string; version: string }> {
  return apiFetch('/me/consent', { method: 'POST', json: { version } });
}

/** GET /me/export — JSON com todos os dados pessoais (LGPD Art. 18 V). */
export function exportMyData(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/me/export');
}

/**
 * DELETE /me — anonimiza User no backend. Frontend deve então deletar
 * o Firebase user separadamente (auth.currentUser.delete) e fazer logout.
 * Pode falhar com 409 se user é sole KLUB_ADMIN — UI mostra qual Klub.
 */
export function deleteMyAccount(): Promise<{ id: string; anonymizedAt: string }> {
  return apiFetch('/me', { method: 'DELETE' });
}
