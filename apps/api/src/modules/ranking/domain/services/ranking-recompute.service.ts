import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RatingCalculatorService } from '../rating-calculator.service';

interface DateFilter {
  gte: Date;
}

interface RankingForRecompute {
  id: string;
  ratingEngine: string;
  ratingConfig: unknown;
  initialRating: number;
  includesCasualMatches: boolean;
  includesTournamentMatches: boolean;
  includesTournamentPoints: boolean;
  windowType: string;
  windowSize: number | null;
  windowStartDate: Date | null;
}

@Injectable()
export class RankingRecomputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: RatingCalculatorService,
  ) {}

  async recompute(rankingId: string): Promise<{ rebuiltEntries: number }> {
    const ranking = (await this.prisma.klubSportRanking.findUnique({
      where: { id: rankingId },
    })) as RankingForRecompute | null;
    if (!ranking) throw new NotFoundException('Ranking not found');

    const sources = this.buildSourceFilter(ranking);
    const dateFilter = this.buildDateFilter(ranking);

    if (sources.length === 0 && !ranking.includesTournamentPoints) {
      await this.prisma.$transaction(async (tx) => {
        await tx.playerRankingEntry.deleteMany({ where: { rankingId } });
      });
      return { rebuiltEntries: 0 };
    }

    const matches =
      sources.length > 0
        ? await this.prisma.matchResult.findMany({
            where: {
              rankingId,
              status: 'confirmed',
              isWalkover: false,
              source: { in: sources as $Enums.MatchSource[] },
              ...(dateFilter ? { playedAt: dateFilter } : {}),
            },
            orderBy: { playedAt: 'asc' },
            select: {
              player1Id: true,
              player2Id: true,
              winnerId: true,
              playedAt: true,
            },
          })
        : [];

    const ratings = new Map<string, number>();
    const wins = new Map<string, number>();
    const losses = new Map<string, number>();

    for (const m of matches) {
      const r1 = ratings.get(m.player1Id) ?? ranking.initialRating;
      const r2 = ratings.get(m.player2Id) ?? ranking.initialRating;
      const player1Won = m.winnerId === m.player1Id;

      const result = this.calculator.compute(
        ranking.ratingEngine,
        ranking.ratingConfig as Record<string, unknown>,
        r1,
        r2,
        player1Won,
      );

      ratings.set(m.player1Id, result.player1NewRating);
      ratings.set(m.player2Id, result.player2NewRating);

      if (player1Won) {
        wins.set(m.player1Id, (wins.get(m.player1Id) ?? 0) + 1);
        losses.set(m.player2Id, (losses.get(m.player2Id) ?? 0) + 1);
      } else if (m.winnerId === m.player2Id) {
        wins.set(m.player2Id, (wins.get(m.player2Id) ?? 0) + 1);
        losses.set(m.player1Id, (losses.get(m.player1Id) ?? 0) + 1);
      }
    }

    const tournamentPoints = ranking.includesTournamentPoints
      ? await this.computeTournamentPoints(rankingId, dateFilter)
      : new Map<string, number>();

    const allUserIds = new Set<string>([...ratings.keys(), ...tournamentPoints.keys()]);

    await this.prisma.$transaction(async (tx) => {
      await tx.playerRankingEntry.deleteMany({ where: { rankingId } });

      for (const userId of allUserIds) {
        const w = wins.get(userId) ?? 0;
        const l = losses.get(userId) ?? 0;
        await tx.playerRankingEntry.create({
          data: {
            rankingId,
            userId,
            rating: ratings.get(userId) ?? ranking.initialRating,
            tournamentPoints: tournamentPoints.get(userId) ?? 0,
            ratingSource: ratings.has(userId) ? 'calculated' : 'initial',
            gamesPlayed: w + l,
            wins: w,
            losses: l,
          },
        });
      }
    });

    return { rebuiltEntries: allUserIds.size };
  }

  buildSourceFilter(ranking: {
    includesCasualMatches: boolean;
    includesTournamentMatches: boolean;
  }): string[] {
    const sources: string[] = [];
    if (ranking.includesCasualMatches) sources.push('casual');
    if (ranking.includesTournamentMatches) {
      sources.push('tournament', 'tournament_prequalifier');
    }
    return sources;
  }

  buildDateFilter(ranking: {
    windowType: string;
    windowSize: number | null;
    windowStartDate: Date | null;
  }): DateFilter | undefined {
    if (ranking.windowType === 'all_time') return undefined;

    const now = new Date();
    if (ranking.windowType === 'season' || ranking.windowType === 'semester') {
      if (!ranking.windowStartDate) return undefined;
      return { gte: ranking.windowStartDate };
    }

    if (ranking.windowType === 'last_weeks') {
      const weeks = ranking.windowSize ?? 12;
      const ms = weeks * 7 * 24 * 60 * 60 * 1000;
      return { gte: new Date(now.getTime() - ms) };
    }

    return undefined;
  }

  private async computeTournamentPoints(
    rankingId: string,
    dateFilter: DateFilter | undefined,
  ): Promise<Map<string, number>> {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        rankingId,
        status: 'finished',
        pointsApplied: true,
        ...(dateFilter ? { mainEndDate: dateFilter } : {}),
      },
      include: {
        categories: { include: { pointsSchema: true } },
        entries: { where: { finalPosition: { not: null } } },
      },
    });

    const points = new Map<string, number>();
    for (const t of tournaments) {
      for (const entry of t.entries) {
        if (!entry.finalPosition) continue;
        const cat = t.categories.find((c) => c.id === entry.categoryId);
        if (!cat) continue;
        const schemaPoints =
          (cat.pointsSchema.points as Record<string, number>)[entry.finalPosition] ?? 0;
        points.set(entry.userId, (points.get(entry.userId) ?? 0) + schemaPoints);
      }
    }

    return points;
  }
}
