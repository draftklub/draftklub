import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface UpdateReportingModeCommand {
  tournamentId: string;
  mode: 'committee_only' | 'player_with_confirm';
  updatedById: string;
}

@Injectable()
export class UpdateReportingModeHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: UpdateReportingModeCommand) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status === 'finished') {
      throw new BadRequestException('Cannot change mode: tournament is finished');
    }

    return this.prisma.tournament.update({
      where: { id: cmd.tournamentId },
      data: { resultReportingMode: cmd.mode },
    });
  }
}
