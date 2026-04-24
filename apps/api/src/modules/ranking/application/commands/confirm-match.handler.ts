import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RatingCalculatorService } from '../../domain/rating-calculator.service';

export interface ConfirmMatchCommand {
  matchId: string;
  confirmedById: string;
}

@Injectable()
export class ConfirmMatchHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: RatingCalculatorService,
  ) {}

  async execute(cmd: ConfirmMatchCommand) {
    const match = await this.prisma.matchResult.findUnique({
      where: { id: cmd.matchId },
      include: { ranking: true },
    });

    if (!match) throw new NotFoundException(`Match ${cmd.matchId} not found`);

    if (match.status !== 'pending_confirmation') {
      throw new BadRequestException(`Match is already ${match.status}`);
    }

    if (cmd.confirmedById === match.submittedById) {
      throw new ForbiddenException('Cannot confirm your own match submission');
    }

    if (cmd.confirmedById !== match.player1Id && cmd.confirmedById !== match.player2Id) {
      throw new ForbiddenException('Only a player in the match can confirm');
    }

    if (match.player1RatingBefore == null || match.player2RatingBefore == null) {
      throw new BadRequestException('Match is missing rating snapshots');
    }

    const player1Won = match.winnerId === match.player1Id;

    const ratingResult = this.calculator.compute(
      match.ranking.ratingEngine,
      match.ranking.ratingConfig as Record<string, unknown>,
      match.player1RatingBefore,
      match.player2RatingBefore,
      player1Won,
    );

    const [updatedMatch] = await this.prisma.$transaction([
      this.prisma.matchResult.update({
        where: { id: match.id },
        data: {
          status: 'confirmed',
          confirmedById: cmd.confirmedById,
          confirmedAt: new Date(),
          player1RatingAfter: ratingResult.player1NewRating,
          player2RatingAfter: ratingResult.player2NewRating,
          ratingDelta1: ratingResult.player1Delta,
          ratingDelta2: ratingResult.player2Delta,
        },
      }),
      this.prisma.playerRankingEntry.update({
        where: { rankingId_userId: { rankingId: match.rankingId, userId: match.player1Id } },
        data: {
          rating: ratingResult.player1NewRating,
          lastRatingChange: ratingResult.player1Delta,
          lastPlayedAt: match.playedAt,
          gamesPlayed: { increment: 1 },
          wins: player1Won ? { increment: 1 } : undefined,
          losses: !player1Won ? { increment: 1 } : undefined,
          ratingSource: 'calculated',
        },
      }),
      this.prisma.playerRankingEntry.update({
        where: { rankingId_userId: { rankingId: match.rankingId, userId: match.player2Id } },
        data: {
          rating: ratingResult.player2NewRating,
          lastRatingChange: ratingResult.player2Delta,
          lastPlayedAt: match.playedAt,
          gamesPlayed: { increment: 1 },
          wins: !player1Won ? { increment: 1 } : undefined,
          losses: player1Won ? { increment: 1 } : undefined,
          ratingSource: 'calculated',
        },
      }),
    ]);

    await this.recalculatePositions(match.rankingId);

    return updatedMatch;
  }

  private async recalculatePositions(rankingId: string): Promise<void> {
    const entries = await this.prisma.playerRankingEntry.findMany({
      where: { rankingId, active: true },
      orderBy: { rating: 'desc' },
    });

    await this.prisma.$transaction(
      entries.map((entry, index) =>
        this.prisma.playerRankingEntry.update({
          where: { id: entry.id },
          data: { position: index + 1 },
        }),
      ),
    );
  }
}
