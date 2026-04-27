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
