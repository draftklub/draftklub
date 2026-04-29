import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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

/**
 * Sprint N batch N-16 — leaderboard cursor inclui chaves do ORDER BY
 * pra keyset DB-side (rating/tournament_points). `position` viaja
 * dentro do cursor pra evitar count() extra por página.
 */
interface LeaderboardCursor extends Record<string, unknown> {
  userId: string;
  rating: number;
  tournamentPoints: number;
  position: number;
}

const DEFAULT_LEADERBOARD_LIMIT = 100;

@Injectable()
export class GetRankingHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sprint N batch 5 — leaderboard cursor pagination (em memória).
   * Sprint N batch N-16 — keyset DB-side em rating/tournament_points
   * (combined continua em memória — score calculado com pesos dinâmicos
   * não é indexável).
   *
   * Trade-offs:
   * - rating/tournament_points: DB ordena via ORDER BY composto + tiebreak
   *   por userId. WHERE keyset filtra entries "depois" do cursor sem
   *   precisar fetchar o leaderboard inteiro.
   * - combined: fetch full + sort JS (mesmo flow antigo). Em rankings
   *   grandes, considere materializar score.
   *
   * `position` exposta é ABSOLUTA (cumulativo via cursor.position),
   * não relativa à página.
   */
  async execute(
    rankingId: string,
    params: CursorPaginationParams = { limit: DEFAULT_LEADERBOARD_LIMIT },
  ) {
    const limit = params.limit ?? DEFAULT_LEADERBOARD_LIMIT;
    const cursor = decodeCursor<LeaderboardCursor>(params.cursor);

    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: rankingId },
    });

    if (!ranking) throw new NotFoundException(`Ranking ${rankingId} not found`);

    const totalCount = await this.prisma.playerRankingEntry.count({
      where: { rankingId, active: true },
    });

    const baseFields = {
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
    };

    if (ranking.orderBy === 'combined') {
      const allEntries = await this.prisma.playerRankingEntry.findMany({
        where: { rankingId, active: true },
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });
      const sorted = sortEntries(
        allEntries,
        'combined',
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
      const nextCursor =
        hasMore && lastEntry
          ? encodeCursor({
              userId: lastEntry.userId,
              rating: lastEntry.rating,
              tournamentPoints: lastEntry.tournamentPoints,
              position: startIdx + pageEntries.length,
            })
          : null;
      return {
        ...baseFields,
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
        nextCursor,
        totalCount,
      };
    }

    const orderBy: Prisma.PlayerRankingEntryOrderByWithRelationInput[] =
      ranking.orderBy === 'tournament_points'
        ? [{ tournamentPoints: 'desc' }, { rating: 'desc' }, { userId: 'asc' }]
        : [{ rating: 'desc' }, { userId: 'asc' }];

    const where: Prisma.PlayerRankingEntryWhereInput = { rankingId, active: true };
    if (cursor) {
      if (ranking.orderBy === 'tournament_points') {
        where.OR = [
          { tournamentPoints: { lt: cursor.tournamentPoints } },
          {
            tournamentPoints: cursor.tournamentPoints,
            rating: { lt: cursor.rating },
          },
          {
            tournamentPoints: cursor.tournamentPoints,
            rating: cursor.rating,
            userId: { gt: cursor.userId },
          },
        ];
      } else {
        where.OR = [
          { rating: { lt: cursor.rating } },
          { rating: cursor.rating, userId: { gt: cursor.userId } },
        ];
      }
    }

    const entries = await this.prisma.playerRankingEntry.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    const hasMore = entries.length > limit;
    const pageEntries = entries.slice(0, limit);
    const startPosition = cursor ? cursor.position + 1 : 1;
    const lastEntry = pageEntries[pageEntries.length - 1];
    const nextCursor =
      hasMore && lastEntry
        ? encodeCursor({
            userId: lastEntry.userId,
            rating: lastEntry.rating,
            tournamentPoints: lastEntry.tournamentPoints,
            position: startPosition + pageEntries.length - 1,
          })
        : null;

    return {
      ...baseFields,
      players: pageEntries.map((e, idx) => ({
        position: startPosition + idx,
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
      nextCursor,
      totalCount,
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
