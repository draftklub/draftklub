import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetRankingHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(rankingId: string) {
    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: rankingId },
      include: {
        entries: {
          where: { active: true },
          orderBy: [{ position: 'asc' }, { rating: 'desc' }],
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
      players: ranking.entries.map((e) => ({
        position: e.position,
        userId: e.userId,
        fullName: e.user.fullName,
        avatarUrl: e.user.avatarUrl,
        rating: e.rating,
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
