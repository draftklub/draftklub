import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RatingCalculatorService } from '../../../ranking/domain/rating-calculator.service';
import { TournamentProgressionService } from '../../domain/services/tournament-progression.service';

type Tx = Prisma.TransactionClient;

export interface ConfirmTournamentMatchCommand {
  tournamentId: string;
  matchId: string;
  confirmedById: string;
}

@Injectable()
export class ConfirmTournamentMatchHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: RatingCalculatorService,
    private readonly progression: TournamentProgressionService,
  ) {}

  async execute(cmd: ConfirmTournamentMatchCommand) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: cmd.matchId },
      include: {
        tournament: { include: { ranking: true } },
        matchResult: true,
      },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Match does not belong to this tournament');
    }
    if (match.tournament.status === 'finished') {
      throw new BadRequestException('Cannot confirm: tournament is finished');
    }
    if (match.status !== 'awaiting_confirmation' || !match.matchResult) {
      throw new BadRequestException('Match is not awaiting confirmation');
    }

    const mr = match.matchResult;

    if (cmd.confirmedById === mr.submittedById) {
      throw new ForbiddenException('Cannot confirm your own submission');
    }
    if (cmd.confirmedById !== match.player1Id && cmd.confirmedById !== match.player2Id) {
      throw new ForbiddenException('Only a player in the match can confirm');
    }

    const isPrequalifier = match.matchKind === 'prequalifier';

    const player1Won = mr.winnerId === match.player1Id;
    const engine = match.tournament.ranking.ratingEngine;
    const config = match.tournament.ranking.ratingConfig as Record<string, unknown>;

    const p1RatingBefore = mr.player1RatingBefore ?? 1000;
    const p2RatingBefore = mr.player2RatingBefore ?? 1000;

    let ratingResult = {
      player1Delta: 0,
      player2Delta: 0,
      player1NewRating: p1RatingBefore,
      player2NewRating: p2RatingBefore,
    };

    if (!isPrequalifier && (engine === 'elo' || engine === 'win_loss')) {
      ratingResult = this.calculator.compute(engine, config, p1RatingBefore, p2RatingBefore, player1Won);
    }

    const player1Id = match.player1Id;
    const player2Id = match.player2Id;
    const winnerId = mr.winnerId;

    if (!player1Id || !player2Id || !winnerId) {
      throw new BadRequestException('Match is missing players or winner');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.matchResult.update({
        where: { id: mr.id },
        data: {
          status: 'confirmed',
          confirmedById: cmd.confirmedById,
          confirmedAt: new Date(),
          player1RatingAfter: ratingResult.player1NewRating,
          player2RatingAfter: ratingResult.player2NewRating,
          ratingDelta1: ratingResult.player1Delta,
          ratingDelta2: ratingResult.player2Delta,
        },
      });

      await tx.tournamentMatch.update({
        where: { id: match.id },
        data: {
          status: 'completed',
          winnerId,
          completedAt: new Date(),
        },
      });

      if (!isPrequalifier && (engine === 'elo' || engine === 'win_loss')) {
        await upsertEntry(
          tx,
          match.tournament.rankingId,
          player1Id,
          ratingResult.player1NewRating,
          ratingResult.player1Delta,
          player1Won,
        );
        await upsertEntry(
          tx,
          match.tournament.rankingId,
          player2Id,
          ratingResult.player2NewRating,
          ratingResult.player2Delta,
          !player1Won,
        );
      }

      await this.progression.advance(
        tx as unknown as Parameters<TournamentProgressionService['advance']>[0],
        {
          id: match.id,
          tournamentId: match.tournamentId,
          phase: match.phase,
          player1Id,
          player2Id,
          nextMatchId: match.nextMatchId,
          nextMatchSlot: match.nextMatchSlot,
          matchKind: match.matchKind,
          categoryId: match.categoryId,
          bracketPosition: match.bracketPosition,
        },
        winnerId,
      );

      return tx.tournamentMatch.findUnique({
        where: { id: match.id },
        include: { matchResult: true },
      });
    });
  }
}

async function upsertEntry(
  tx: Tx,
  rankingId: string,
  userId: string,
  newRating: number,
  delta: number,
  won: boolean,
): Promise<void> {
  await tx.playerRankingEntry.upsert({
    where: { rankingId_userId: { rankingId, userId } },
    create: {
      rankingId,
      userId,
      rating: newRating,
      ratingSource: 'calculated',
      gamesPlayed: 1,
      wins: won ? 1 : 0,
      losses: !won ? 1 : 0,
      lastRatingChange: delta,
      lastPlayedAt: new Date(),
    },
    update: {
      rating: newRating,
      lastRatingChange: delta,
      lastPlayedAt: new Date(),
      gamesPlayed: { increment: 1 },
      wins: won ? { increment: 1 } : undefined,
      losses: !won ? { increment: 1 } : undefined,
      ratingSource: 'calculated',
    },
  });
}
