import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface EditTournamentMatchResultCommand {
  tournamentId: string;
  matchId: string;
  winnerId: string;
  score?: string;
  editedById: string;
}

@Injectable()
export class EditTournamentMatchResultHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: EditTournamentMatchResultCommand) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: cmd.matchId },
      include: { tournament: true, matchResult: true },
    });

    if (!match) throw new NotFoundException('Match not found');
    if (match.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Match does not belong to this tournament');
    }
    if (match.tournament.status === 'finished') {
      throw new BadRequestException('Cannot edit: tournament is finished');
    }
    if (!match.matchResult) {
      throw new BadRequestException('Match has no result. Use POST /result first.');
    }
    if (cmd.winnerId !== match.player1Id && cmd.winnerId !== match.player2Id) {
      throw new BadRequestException('Winner must be one of the match players');
    }

    if (cmd.winnerId === match.winnerId) {
      await this.prisma.matchResult.update({
        where: { id: match.matchResult.id },
        data: { score: cmd.score },
      });
      return this.prisma.tournamentMatch.findUnique({
        where: { id: match.id },
        include: { matchResult: true },
      });
    }

    if (match.nextMatchId) {
      const nextMatch = await this.prisma.tournamentMatch.findUnique({
        where: { id: match.nextMatchId },
      });
      if (
        nextMatch &&
        ['completed', 'walkover', 'double_walkover', 'awaiting_confirmation'].includes(
          nextMatch.status,
        )
      ) {
        throw new BadRequestException(
          'Cannot change winner: next round already progressed. Cascade revert is a wave 2 feature.',
        );
      }
    }

    throw new BadRequestException(
      'Winner change with next-round cleanup not yet implemented. Wave 2 feature.',
    );
  }
}
