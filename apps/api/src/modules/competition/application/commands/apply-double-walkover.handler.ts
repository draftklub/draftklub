import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ApplyDoubleWalkoverCommand {
  tournamentId: string;
  matchId: string;
  submittedById: string;
  notes?: string;
}

@Injectable()
export class ApplyDoubleWalkoverHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApplyDoubleWalkoverCommand) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: cmd.matchId },
      include: { tournament: true },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Match does not belong to this tournament');
    }
    if (match.tournament.status === 'finished') {
      throw new BadRequestException('Cannot apply double walkover: tournament is finished');
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

    const player1Id = match.player1Id;
    const player2Id = match.player2Id;

    return this.prisma.$transaction(async (tx) => {
      const matchResult = await tx.matchResult.create({
        data: {
          rankingId: match.tournament.rankingId,
          player1Id,
          player2Id,
          winnerId: null,
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
          status: 'double_walkover',
          winnerId: null,
          matchResultId: matchResult.id,
          completedAt: new Date(),
        },
      });

      await tx.tournamentEntry.updateMany({
        where: {
          tournamentId: cmd.tournamentId,
          userId: { in: [player1Id, player2Id] },
        },
        data: { status: 'disqualified' },
      });

      return matchResult;
    });
  }
}
