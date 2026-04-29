import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  type CursorPaginationParams,
  decodeCursor,
  encodeCursor,
} from '../../../../shared/pagination/cursor';

interface RankingEntryRow {
  userId: string;
  rating: number;
  tournamentPoints: number;
  ratingSource: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  lastRatingChange: number;
  lastPlayedAt: Date | null;
  user: { id: string; fullName: string; avatarUrl: string | null };
}

interface LeaderboardCursor extends Record<string, unknown> {
  userId: string;
}

const DEFAULT_LEADERBOARD_LIMIT = 100;

@Injectable()
export class GetRankingHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sprint N batch 5 — leaderboard cursor pagination.
   *
   * Sort happens em JS (orderBy='rating'|'tournament_points'|'combined'
   * — `combined` é calculado, não há ORDER BY direto). Aplicamos slice
   * sobre o array já ordenado: cursor = userId do último item da página
   * anterior; backend find o índice e fatia a partir dele.
   *
   * `position` exposta é ABSOLUTA no leaderboard (não relativa à página)
   * — primeiro item da página 2 mostra position=N+1, não 1.
   *
   * Trade-off: ainda fetch+sort de TODAS as entries (mesmo custo DB);
   * payload da response é que diminui. Pra rankings com 1000s de
   * players, próximo passo é particionar a query por orderBy específico
   * (DB-side keyset pra rating/tournament_points).
   */
  async execute(
    rankingId: string,
    params: CursorPaginationParams = { limit: DEFAULT_LEADERBOARD_LIMIT },
  ) {
    const limit = params.limit ?? DEFAULT_LEADERBOARD_LIMIT;
    const cursor = decodeCursor<LeaderboardCursor>(params.cursor);

    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: rankingId },
      include: {
        entries: {
          where: { active: true },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!ranking) throw new NotFoundException(`Ranking ${rankingId} not found`);

    const sorted = sortEntries(
      ranking.entries,
      ranking.orderBy,
      ranking.combinedWeight as { ratingWeight: number; pointsWeight: number } | null,
    );

    let startIdx = 0;
    if (cursor) {
      const idx = sorted.findIndex((e) => e.userId === cursor.userId);
      startIdx = idx >= 0 ? idx + 1 : 0;
    }

    const slice = sorted.slice(startIdx, startIdx + limit + 1);
    const pageEntries = slice.slice(0, limit);
    const hasMore = slice.length > limit;
    const lastEntry = pageEntries[pageEntries.length - 1];
    const nextCursor = hasMore && lastEntry ? encodeCursor({ userId: lastEntry.userId }) : null;

    return {
      id: ranking.id,
      name: ranking.name,
      type: ranking.type,
      gender: ranking.gender,
      ageMin: ranking.ageMin,
      ageMax: ranking.ageMax,
      ratingEngine: ranking.ratingEngine,
      initialRating: ranking.initialRating,
      active: ranking.active,
      orderBy: ranking.orderBy,
      windowType: ranking.windowType,
      windowSize: ranking.windowSize,
      includesCasualMatches: ranking.includesCasualMatches,
      includesTournamentMatches: ranking.includesTournamentMatches,
      includesTournamentPoints: ranking.includesTournamentPoints,
      players: pageEntries.map((e, idx) => ({
        position: startIdx + idx + 1,
        userId: e.userId,
        fullName: e.user.fullName,
        avatarUrl: e.user.avatarUrl,
        rating: e.rating,
        tournamentPoints: e.tournamentPoints,
        ratingSource: e.ratingSource,
        wins: e.wins,
        losses: e.losses,
        gamesPlayed: e.gamesPlayed,
        lastRatingChange: e.lastRatingChange,
        lastPlayedAt: e.lastPlayedAt,
      })),
      /** Sprint N batch 5 — pagination cursor. null = última página. */
      nextCursor,
      /** Total de entries no ranking (não paginado). UI mostra "X de Y". */
      totalCount: sorted.length,
    };
  }
}

export function sortEntries(
  entries: RankingEntryRow[],
  orderBy: string,
  combinedWeight: { ratingWeight: number; pointsWeight: number } | null,
): RankingEntryRow[] {
  const arr = [...entries];

  if (orderBy === 'tournament_points') {
    arr.sort((a, b) => {
      if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
      return b.rating - a.rating;
    });
    return arr;
  }

  if (orderBy === 'combined') {
    const w = combinedWeight ?? { ratingWeight: 0.5, pointsWeight: 0.5 };
    arr.sort((a, b) => {
      const scoreA = a.rating * w.ratingWeight + a.tournamentPoints * w.pointsWeight;
      const scoreB = b.rating * w.ratingWeight + b.tournamentPoints * w.pointsWeight;
      return scoreB - scoreA;
    });
    return arr;
  }

  // Default: rating
  arr.sort((a, b) => b.rating - a.rating);
  return arr;
}
