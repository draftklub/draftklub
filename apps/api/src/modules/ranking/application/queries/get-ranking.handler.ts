import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

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

@Injectable()
export class GetRankingHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rankingId: string) {
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
      players: sorted.map((e, idx) => ({
        position: idx + 1,
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
