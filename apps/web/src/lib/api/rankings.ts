import type { MatchResult, RankingDetail, RankingListItem } from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * Sprint K — clients de rankings + casual matches.
 * Read em K1a; mutations (enroll, submit-match, confirm-match) em K3c.
 *
 * NOTA: o backend exige `klubId` e `sportCode` no path mesmo no GET de
 * detail (`/klubs/:klubId/sports/:sportCode/rankings/:rankingId`), então o
 * client recebe os 3 ids. PolicyGuard só usa klubId pro scope.
 */

export function listKlubRankings(klubId: string, sportCode: string): Promise<RankingListItem[]> {
  return apiFetch<RankingListItem[]>(`/klubs/${klubId}/sports/${sportCode}/rankings`);
}

export function getRanking(
  klubId: string,
  sportCode: string,
  rankingId: string,
): Promise<RankingDetail> {
  return apiFetch<RankingDetail>(`/klubs/${klubId}/sports/${sportCode}/rankings/${rankingId}`);
}

// ─── Mutations (Sprint K PR-K3c — enroll + casual match flow) ──────────

export interface EnrollPlayerInput {
  /** Se omitido, backend usa o caller (self-enroll). */
  userId?: string;
  /** Override do initialRating do ranking. */
  initialRating?: number;
}

/** POST /klubs/:klubId/sports/:sportCode/rankings/:rankingId/entries */
export function enrollPlayerInRanking(
  klubId: string,
  sportCode: string,
  rankingId: string,
  input: EnrollPlayerInput = {},
): Promise<unknown> {
  return apiFetch(`/klubs/${klubId}/sports/${sportCode}/rankings/${rankingId}/entries`, {
    method: 'POST',
    json: input,
  });
}

export interface SubmitCasualMatchInput {
  rankingId: string;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  score?: string;
  /** ISO 8601 datetime; backend default now(). */
  playedAt?: string;
  spaceId?: string;
  notes?: string;
}

/** POST /matches — submit casual match (status pending_confirmation). */
export function submitCasualMatch(input: SubmitCasualMatchInput): Promise<MatchResult> {
  return apiFetch<MatchResult>('/matches', { method: 'POST', json: input });
}

/** POST /matches/:id/confirm — outro player confirma match casual. */
export function confirmCasualMatch(matchId: string): Promise<MatchResult> {
  return apiFetch<MatchResult>(`/matches/${matchId}/confirm`, { method: 'POST', json: {} });
}
