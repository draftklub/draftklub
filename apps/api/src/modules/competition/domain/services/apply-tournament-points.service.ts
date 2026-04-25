import { Injectable } from '@nestjs/common';

interface PointsApplyTx {
  tournament: {
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  playerRankingEntry: {
    upsert: (args: unknown) => Promise<unknown>;
  };
}

interface TournamentForPoints {
  id: string;
  rankingId: string;
  pointsApplied: boolean;
  ranking: { includesTournamentPoints: boolean };
  categories: {
    id: string;
    pointsSchema: { points: unknown };
  }[];
  entries: {
    userId: string;
    categoryId: string | null;
    finalPosition: string | null;
  }[];
}

@Injectable()
export class ApplyTournamentPointsService {
  async apply(tx: PointsApplyTx, tournamentId: string): Promise<{ applied: number }> {
    const tournament = (await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ranking: { select: { includesTournamentPoints: true } },
        categories: { include: { pointsSchema: { select: { points: true } } } },
        entries: { where: { finalPosition: { not: null } } },
      },
    })) as TournamentForPoints | null;

    if (!tournament) return { applied: 0 };
    if (tournament.pointsApplied) return { applied: 0 };

    if (!tournament.ranking.includesTournamentPoints) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { pointsApplied: true, pointsAppliedAt: new Date() },
      });
      return { applied: 0 };
    }

    let applied = 0;
    for (const entry of tournament.entries) {
      if (!entry.finalPosition || !entry.categoryId) continue;
      const cat = tournament.categories.find((c) => c.id === entry.categoryId);
      if (!cat) continue;
      const schema = cat.pointsSchema.points as Record<string, number> | null;
      if (!schema) continue;
      const pts = schema[entry.finalPosition] ?? 0;
      if (pts === 0) continue;

      await tx.playerRankingEntry.upsert({
        where: {
          rankingId_userId: { rankingId: tournament.rankingId, userId: entry.userId },
        },
        create: {
          rankingId: tournament.rankingId,
          userId: entry.userId,
          rating: 1000,
          tournamentPoints: pts,
          lastTournamentAppliedAt: new Date(),
          ratingSource: 'manual',
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
        },
        update: {
          tournamentPoints: { increment: pts },
          lastTournamentAppliedAt: new Date(),
        },
      });
      applied++;
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { pointsApplied: true, pointsAppliedAt: new Date() },
    });

    return { applied };
  }
}
