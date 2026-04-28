import type {
  RankingPointsSchema,
  TournamentBracket,
  TournamentDetail,
  TournamentEntry,
  TournamentFormat,
  TournamentRegistrationApproval,
  TournamentStatus,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * Sprint K PR-K1a — clients de leitura pra torneios.
 * Mutations (create/draw/schedule/cancel/match operations) entram em K2+.
 */

/** Item leve do GET /klubs/:klubId/sports/:sportCode/tournaments. */
export interface TournamentListItem {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  currentPhase: string | null;
  hasPrequalifiers: boolean;
  registrationApproval: TournamentRegistrationApproval;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  drawDate: string | null;
  mainStartDate: string | null;
  mainEndDate: string | null;
  entryCount: number;
  categoryCount: number;
}

export function listKlubTournaments(
  klubId: string,
  sportCode: string,
): Promise<TournamentListItem[]> {
  return apiFetch<TournamentListItem[]>(`/klubs/${klubId}/sports/${sportCode}/tournaments`);
}

export function getTournament(
  klubId: string,
  sportCode: string,
  tournamentId: string,
): Promise<TournamentDetail> {
  return apiFetch<TournamentDetail>(
    `/klubs/${klubId}/sports/${sportCode}/tournaments/${tournamentId}`,
  );
}

export function listTournamentEntries(tournamentId: string): Promise<TournamentEntry[]> {
  return apiFetch<TournamentEntry[]>(`/tournaments/${tournamentId}/entries`);
}

export function getTournamentBracket(tournamentId: string): Promise<TournamentBracket> {
  return apiFetch<TournamentBracket>(`/tournaments/${tournamentId}/bracket`);
}

export function listPointsSchemas(
  klubId: string,
  sportCode: string,
): Promise<RankingPointsSchema[]> {
  return apiFetch<RankingPointsSchema[]>(`/klubs/${klubId}/sports/${sportCode}/points-schemas`);
}
