import type { RankingDetail, RankingListItem } from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * Sprint K PR-K1a — clients pra leitura de rankings.
 * Mutations (create/enroll/update + match submit/confirm) entram em K3+.
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
