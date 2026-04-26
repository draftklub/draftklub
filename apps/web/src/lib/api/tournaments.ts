import { apiFetch } from './client';

export interface TournamentListItem {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  currentPhase: string | null;
  hasPrequalifiers: boolean;
  registrationApproval: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  drawDate: string | null;
  mainStartDate: string | null;
  mainEndDate: string | null;
  entryCount: number;
  categoryCount: number;
}

/**
 * GET /klubs/:klubId/sports/:sportCode/tournaments — lista torneios
 * (todos os status, ordenados por mainStartDate desc).
 */
export function listKlubTournaments(
  klubId: string,
  sportCode: string,
): Promise<TournamentListItem[]> {
  return apiFetch<TournamentListItem[]>(
    `/klubs/${klubId}/sports/${sportCode}/tournaments`,
  );
}
