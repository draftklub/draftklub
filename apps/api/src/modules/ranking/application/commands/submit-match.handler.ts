import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface SubmitMatchCommand {
  rankingId: string;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  score?: string;
  playedAt?: Date;
  spaceId?: string;
  notes?: string;
  submittedById: string;
}

@Injectable()
export class SubmitMatchHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: SubmitMatchCommand) {
    if (cmd.player1Id === cmd.player2Id) {
      throw new BadRequestException('Player cannot play against themselves');
    }

    if (cmd.winnerId !== cmd.player1Id && cmd.winnerId !== cmd.player2Id) {
      throw new BadRequestException('Winner must be one of the players');
    }

    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: cmd.rankingId },
    });
    if (!ranking) throw new NotFoundException(`Ranking ${cmd.rankingId} not found`);

    const [entry1, entry2] = await Promise.all([
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: cmd.rankingId, userId: cmd.player1Id } },
      }),
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: cmd.rankingId, userId: cmd.player2Id } },
      }),
    ]);

    if (!entry1) {
      await this.prisma.playerRankingEntry.create({
        data: {
          rankingId: cmd.rankingId,
          userId: cmd.player1Id,
          rating: ranking.initialRating,
          ratingSource: 'initial',
        },
      });
    }

    if (!entry2) {
      await this.prisma.playerRankingEntry.create({
        data: {
          rankingId: cmd.rankingId,
          userId: cmd.player2Id,
          rating: ranking.initialRating,
          ratingSource: 'initial',
        },
      });
    }

    const [p1Entry, p2Entry] = await Promise.all([
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: cmd.rankingId, userId: cmd.player1Id } },
      }),
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: cmd.rankingId, userId: cmd.player2Id } },
      }),
    ]);

    if (!p1Entry || !p2Entry) {
      throw new NotFoundException('Player entries not found after creation');
    }

    return this.prisma.matchResult.create({
      data: {
        rankingId: cmd.rankingId,
        player1Id: cmd.player1Id,
        player2Id: cmd.player2Id,
        winnerId: cmd.winnerId,
        score: cmd.score,
        status: 'pending_confirmation',
        submittedById: cmd.submittedById,
        playedAt: cmd.playedAt ?? new Date(),
        spaceId: cmd.spaceId,
        notes: cmd.notes,
        player1RatingBefore: p1Entry.rating,
        player2RatingBefore: p2Entry.rating,
      },
    });
  }
}
