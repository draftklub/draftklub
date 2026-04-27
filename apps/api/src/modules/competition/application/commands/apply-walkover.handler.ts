import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TournamentProgressionService } from '../../domain/services/tournament-progression.service';

export interface ApplyWalkoverCommand {
  tournamentId: string;
  matchId: string;
  winnerId: string;
  submittedById: string;
  notes?: string;
}

@Injectable()
export class ApplyWalkoverHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: TournamentProgressionService,
  ) {}

  async execute(cmd: ApplyWalkoverCommand) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: cmd.matchId },
      include: { tournament: true },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Match does not belong to this tournament');
    }
    if (match.tournament.status === 'finished') {
      throw new BadRequestException('Cannot apply walkover: tournament is finished');
    }
    if (match.status === 'completed') {
      throw new BadRequestException('Match already completed');
    }
    if (['bye', 'walkover', 'double_walkover'].includes(match.status)) {
      throw new BadRequestException(`Match already ${match.status}`);
    }
    if (!match.player1Id || !match.player2Id) {
      throw new BadRequestException('Match has undefined players');
    }
    if (cmd.winnerId !== match.player1Id && cmd.winnerId !== match.player2Id) {
      throw new BadRequestException('Winner must be one of the match players');
    }

    const loserId = cmd.winnerId === match.player1Id ? match.player2Id : match.player1Id;
    const player1Id = match.player1Id;
    const player2Id = match.player2Id;

    return this.prisma.$transaction(async (tx) => {
      const matchResult = await tx.matchResult.create({
        data: {
          rankingId: match.tournament.rankingId,
          player1Id,
          player2Id,
          winnerId: cmd.winnerId,
          status: 'confirmed',
          submittedById: cmd.submittedById,
          confirmedById: cmd.submittedById,
          confirmedAt: new Date(),
          playedAt: new Date(),
          notes: cmd.notes,
          source: 'tournament',
          tournamentId: cmd.tournamentId,
          tournamentMatchId: cmd.matchId,
          phase: match.phase,
          bracketPosition: match.bracketPosition,
          isWalkover: true,
        },
      });

      await tx.tournamentMatch.update({
        where: { id: match.id },
        data: {
          status: 'walkover',
          winnerId: cmd.winnerId,
          matchResultId: matchResult.id,
          completedAt: new Date(),
        },
      });

      await tx.tournamentEntry.updateMany({
        where: { tournamentId: cmd.tournamentId, userId: loserId },
        data: { status: 'withdrawn', withdrawnAt: new Date() },
      });

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
        cmd.winnerId,
      );

      return matchResult;
    });
  }
}
