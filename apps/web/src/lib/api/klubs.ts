import type {
  Klub,
  KlubAccessMode,
  KlubDiscoveryResult,
  KlubPlan,
  KlubType,
} from '@draftklub/shared-types';
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
  /** Sprint B: opt-in pra `GET /klubs/discover`. Default false. */
  discoverable?: boolean;
  /** Sprint B: 'public' (entrada livre) | 'private' (precisa request — Sprint C). */
  accessMode?: KlubAccessMode;
  cep?: string;
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

export interface DiscoverKlubsParams {
  q?: string;
  state?: string;
  sport?: string;
  limit?: number;
  /** Sprint B+1: lat/lng (browser geolocation ou fallback CEP do user). */
  lat?: number;
  lng?: number;
  /** Sprint B+1: raio em km. Sem geo presente, ignorado pelo backend. */
  radiusKm?: number;
}

/**
 * GET /klubs/discover — lista Klubs com `discoverable=true`. Filtros
 * opcionais; backend ordena por distância (Haversine) quando lat/lng
 * são enviados, senão por tier (mesma cidade > mesmo estado > resto).
 */
export function discoverKlubs(p: DiscoverKlubsParams = {}): Promise<KlubDiscoveryResult[]> {
  const qs = new URLSearchParams();
  if (p.q) qs.set('q', p.q);
  if (p.state) qs.set('state', p.state);
  if (p.sport) qs.set('sport', p.sport);
  if (p.limit) qs.set('limit', String(p.limit));
  if (typeof p.lat === 'number') qs.set('lat', String(p.lat));
  if (typeof p.lng === 'number') qs.set('lng', String(p.lng));
  if (typeof p.radiusKm === 'number') qs.set('radiusKm', String(p.radiusKm));
  const suffix = qs.toString();
  return apiFetch<KlubDiscoveryResult[]>(`/klubs/discover${suffix ? `?${suffix}` : ''}`);
}
