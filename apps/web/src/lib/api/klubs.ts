import type {
  CheckSlugResponse,
  CnpjLookupResult,
  Klub,
  KlubAccessMode,
  KlubAddressSource,
  KlubDiscoveryResult,
  KlubPlan,
  KlubType,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * Sprint D PR1: `entityType` virou obrigatório, `slug` foi removido (backend
 * gera servidor-side a partir de name+neighborhood+city). PJ exige `document`
 * (CNPJ); PF exige `creatorCpf` apenas se o user não tem CPF cadastrado no
 * /perfil.
 */
export interface CreateKlubInput {
  name: string;
  type?: KlubType;
  city?: string;
  state?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  entityType: 'pj' | 'pf';
  /** CNPJ só dígitos (14). Obrigatório se entityType='pj'. */
  document?: string;
  /** CPF só dígitos (11). Obrigatório se entityType='pf' e user.documentNumber=null. */
  creatorCpf?: string;
  legalName?: string;
  sportCodes?: string[];
  plan?: KlubPlan;
  discoverable?: boolean;
  accessMode?: KlubAccessMode;
  cep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressSource?: KlubAddressSource;
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

export interface UpdateKlubInput {
  // KLUB_ADMIN
  name?: string;
  description?: string | null;
  type?: 'sports_club' | 'condo' | 'school' | 'public_space' | 'academy' | 'individual';
  avatarUrl?: string | null;
  coverUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  cep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  discoverable?: boolean;
  accessMode?: 'public' | 'private';
  amenities?: Record<string, unknown>;
  // SUPER_ADMIN-only
  legalName?: string | null;
  plan?: 'trial' | 'starter' | 'pro' | 'elite' | 'enterprise';
  status?: 'trial' | 'active' | 'suspended' | 'churned' | 'pending_payment';
  maxMembers?: number;
  maxSports?: number;
  maxCourts?: number;
}

/** PATCH /klubs/:id — KLUB_ADMIN ou SUPER_ADMIN. */
export function updateKlub(id: string, input: UpdateKlubInput): Promise<Klub> {
  return apiFetch<Klub>(`/klubs/${id}`, { method: 'PATCH', json: input });
}

/** DELETE /klubs/:id — SUPER_ADMIN-only. Soft-delete + status='suspended'. */
export function deactivateKlub(id: string, reason?: string): Promise<Klub> {
  return apiFetch<Klub>(`/klubs/${id}`, {
    method: 'DELETE',
    json: { reason },
  });
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
  /** Sprint B+3: filtra Klubs com Spaces operando no período. */
  period?: 'morning' | 'afternoon' | 'evening';
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
  if (p.period) qs.set('period', p.period);
  const suffix = qs.toString();
  return apiFetch<KlubDiscoveryResult[]>(`/klubs/discover${suffix ? `?${suffix}` : ''}`);
}

/**
 * Sprint D PR1 — preview live de slug pro /criar-klub. Backend calcula
 * `nome+bairro+cidade` e responde se está livre. Não bloqueia submit.
 */
export interface CheckSlugParams {
  name: string;
  neighborhood?: string;
  city?: string;
}

export function checkKlubSlug(p: CheckSlugParams): Promise<CheckSlugResponse> {
  const qs = new URLSearchParams();
  qs.set('name', p.name);
  if (p.neighborhood) qs.set('neighborhood', p.neighborhood);
  if (p.city) qs.set('city', p.city);
  return apiFetch<CheckSlugResponse>(`/klubs/check-slug?${qs.toString()}`);
}

/**
 * Sprint D PR1 — consulta CNPJ na BrasilAPI via backend. Falha silenciosa
 * (rede/404) retorna null; UI cai em manual.
 */
export function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = cnpj.replace(/\D/g, '');
  return apiFetch<CnpjLookupResult | null>(`/klubs/cnpj-lookup?cnpj=${digits}`);
}
