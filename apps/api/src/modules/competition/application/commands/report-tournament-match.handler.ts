import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RatingCalculatorService } from '../../../ranking/domain/rating-calculator.service';
import { TournamentProgressionService } from '../../domain/services/tournament-progression.service';

type Tx = Prisma.TransactionClient;

export interface ReportTournamentMatchCommand {
  tournamentId: string;
  matchId: string;
  winnerId: string;
  score?: string;
  notes?: string;
  submittedById: string;
  submittedByIsCommittee: boolean;
}

@Injectable()
export class ReportTournamentMatchHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: RatingCalculatorService,
    private readonly progression: TournamentProgressionService,
  ) {}

  async execute(cmd: ReportTournamentMatchCommand) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: cmd.matchId },
      include: { tournament: { include: { ranking: true } } },
    });

    if (!match) throw new NotFoundException(`TournamentMatch ${cmd.matchId} not found`);
    if (match.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Match does not belong to this tournament');
    }
    if (match.tournament.status === 'finished') {
      throw new BadRequestException('Cannot report result: tournament is finished');
    }
    if (match.status === 'completed') {
      throw new BadRequestException('Match already completed. Use PATCH to edit.');
    }
    if (['bye', 'walkover', 'double_walkover'].includes(match.status)) {
      throw new BadRequestException(`Cannot report result for ${match.status} match`);
    }
    if (!match.player1Id || !match.player2Id) {
      throw new BadRequestException('Match has undefined players');
    }
    if (cmd.winnerId !== match.player1Id && cmd.winnerId !== match.player2Id) {
      throw new BadRequestException('Winner must be one of the match players');
    }

    const mode = match.tournament.resultReportingMode;

    if (mode === 'committee_only' && !cmd.submittedByIsCommittee) {
      throw new ForbiddenException('This tournament requires committee to report results');
    }

    if (mode === 'player_with_confirm' && !cmd.submittedByIsCommittee) {
      if (cmd.submittedById !== match.player1Id && cmd.submittedById !== match.player2Id) {
        throw new ForbiddenException('Only a player in the match or committee can report');
      }
    }

    const player1Won = cmd.winnerId === match.player1Id;
    const player1Id = match.player1Id;
    const player2Id = match.player2Id;

    const [p1Entry, p2Entry] = await Promise.all([
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: match.tournament.rankingId, userId: player1Id } },
      }),
      this.prisma.playerRankingEntry.findUnique({
        where: { rankingId_userId: { rankingId: match.tournament.rankingId, userId: player2Id } },
      }),
    ]);

    const p1RatingBefore = p1Entry?.rating ?? 1000;
    const p2RatingBefore = p2Entry?.rating ?? 1000;

    const isDirectConfirm = cmd.submittedByIsCommittee || mode === 'committee_only';

    let ratingResult = {
      player1Delta: 0,
      player2Delta: 0,
      player1NewRating: p1RatingBefore,
      player2NewRating: p2RatingBefore,
    };

    const engine = match.tournament.ranking.ratingEngine;
    const config = match.tournament.ranking.ratingConfig as Record<string, unknown>;

    if (isDirectConfirm && (engine === 'elo' || engine === 'win_loss')) {
      ratingResult = this.calculator.compute(engine, config, p1RatingBefore, p2RatingBefore, player1Won);
    }

    return this.prisma.$transaction(async (tx) => {
      const matchResult = await tx.matchResult.create({
        data: {
          rankingId: match.tournament.rankingId,
          player1Id,
          player2Id,
          winnerId: cmd.winnerId,
          score: cmd.score,
          status: isDirectConfirm ? 'confirmed' : 'pending_confirmation',
          submittedById: cmd.submittedById,
          confirmedById: isDirectConfirm ? cmd.submittedById : null,
          confirmedAt: isDirectConfirm ? new Date() : null,
          playedAt: new Date(),
          notes: cmd.notes,
          player1RatingBefore: p1RatingBefore,
          player2RatingBefore: p2RatingBefore,
          player1RatingAfter: isDirectConfirm ? ratingResult.player1NewRating : null,
          player2RatingAfter: isDirectConfirm ? ratingResult.player2NewRating : null,
          ratingDelta1: isDirectConfirm ? ratingResult.player1Delta : null,
          ratingDelta2: isDirectConfirm ? ratingResult.player2Delta : null,
          source: 'tournament',
          tournamentId: cmd.tournamentId,
          tournamentMatchId: cmd.matchId,
          phase: match.phase,
          bracketPosition: match.bracketPosition,
        },
      });

      await tx.tournamentMatch.update({
        where: { id: match.id },
        data: {
          status: isDirectConfirm ? 'completed' : 'awaiting_confirmation',
          winnerId: isDirectConfirm ? cmd.winnerId : null,
          matchResultId: matchResult.id,
          completedAt: isDirectConfirm ? new Date() : null,
        },
      });

      if (isDirectConfirm) {
        if (engine === 'elo' || engine === 'win_loss') {
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
          },
          cmd.winnerId,
        );
      }

      return matchResult;
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
