import type { Klub, KlubType, KlubPlan } from '@draftklub/shared-types';
import { apiFetch } from './client';

export interface CreateKlubInput {
  name: string;
  /** Opcional. Se omitido, backend gera. Conflito → 409 com type='slug_unavailable'. */
  slug?: string;
  type?: KlubType;
  city?: string;
  state?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  entityType?: 'pj' | 'pf';
  document?: string;
  legalName?: string;
  sportCodes?: string[];
  plan?: KlubPlan;
}

/** GET /klubs — lista global (auth required, requer policy klub.list). */
export function listKlubs(): Promise<Klub[]> {
  return apiFetch<Klub[]>('/klubs');
}

/** GET /klubs/:id — detalhe completo com config + sports. */
export function getKlubById(id: string): Promise<Klub> {
  return apiFetch<Klub>(`/klubs/${id}`);
}

/** GET /klubs/slug/:slug — lookup por slug, usado pelo route guard. */
export function getKlubBySlug(slug: string): Promise<Klub> {
  return apiFetch<Klub>(`/klubs/slug/${slug}`);
}

/**
 * POST /klubs — cria um Klub novo. O criador vira KLUB_ADMIN
 * automaticamente (Membership + RoleAssignment criados na mesma
 * transação no backend).
 */
export function createKlub(input: CreateKlubInput): Promise<Klub> {
  return apiFetch<Klub>('/klubs', { method: 'POST', json: input });
}

/**
 * POST /klubs/slug/:slug/join — aceita convite por link. Adiciona o
 * user logado ao Klub como PLAYER (membership + role atomicamente).
 * Idempotente: re-aceitar o mesmo link no-op.
 */
export function joinKlubBySlug(
  slug: string,
): Promise<{ id: string; klubId: string; userId: string }> {
  return apiFetch(`/klubs/slug/${slug}/join`, { method: 'POST' });
}
