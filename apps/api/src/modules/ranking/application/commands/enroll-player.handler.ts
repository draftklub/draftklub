import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface EnrollPlayerCommand {
  rankingId: string;
  userId: string;
  initialRating?: number;
}

@Injectable()
export class EnrollPlayerHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: EnrollPlayerCommand) {
    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: cmd.rankingId },
    });
    if (!ranking) throw new NotFoundException(`Ranking ${cmd.rankingId} not found`);

    const existing = await this.prisma.playerRankingEntry.findUnique({
      where: { rankingId_userId: { rankingId: cmd.rankingId, userId: cmd.userId } },
    });

    if (existing) {
      if (existing.active) throw new ConflictException('Player already enrolled in this ranking');
      return this.prisma.playerRankingEntry.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }

    return this.prisma.playerRankingEntry.create({
      data: {
        rankingId: cmd.rankingId,
        userId: cmd.userId,
        rating: cmd.initialRating ?? ranking.initialRating,
        ratingSource: 'initial',
      },
    });
  }
}
