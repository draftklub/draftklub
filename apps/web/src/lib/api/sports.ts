import type { KlubSportProfile, SportCatalog } from '@draftklub/shared-types';
import { apiFetch } from './client';

/** GET /sports — catálogo público de modalidades (tennis, padel, ...). */
export function listSports(): Promise<SportCatalog[]> {
  return apiFetch<SportCatalog[]>('/sports', { anonymous: true });
}

/** GET /sports/:code — detalhe de uma modalidade. */
export function getSport(code: string): Promise<SportCatalog> {
  return apiFetch<SportCatalog>(`/sports/${code}`, { anonymous: true });
}

/** GET /klubs/:klubId/sports — modalidades habilitadas em um Klub. */
export function listKlubSports(klubId: string): Promise<KlubSportProfile[]> {
  return apiFetch<KlubSportProfile[]>(`/klubs/${klubId}/sports`);
}

/** POST /klubs/:klubId/sports/:code — habilita modalidade no Klub. */
export function addSportToKlub(klubId: string, code: string): Promise<KlubSportProfile> {
  return apiFetch<KlubSportProfile>(`/klubs/${klubId}/sports/${code}`, {
    method: 'POST',
  });
}
