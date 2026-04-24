import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListRankingsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubId: string, sportCode: string) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { klubId_sportCode: { klubId, sportCode } },
    });
    if (!profile) {
      throw new NotFoundException(`Sport '${sportCode}' not active in Klub ${klubId}`);
    }

    const rankings = await this.prisma.klubSportRanking.findMany({
      where: { klubSportId: profile.id, active: true },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { entries: true } } },
    });

    return rankings.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      gender: r.gender,
      ageMin: r.ageMin,
      ageMax: r.ageMax,
      ratingEngine: r.ratingEngine,
      initialRating: r.initialRating,
      active: r.active,
      playerCount: r._count.entries,
      createdAt: r.createdAt,
    }));
  }
}
