import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface WithdrawEntryCommand {
  tournamentId: string;
  userId: string;
  requestingUserId: string;
}

@Injectable()
export class WithdrawEntryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: WithdrawEntryCommand) {
    if (cmd.userId !== cmd.requestingUserId) {
      throw new ForbiddenException('Can only withdraw your own entry');
    }

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${cmd.tournamentId} not found`);
    }

    const now = new Date();
    if (now > tournament.drawDate) {
      throw new BadRequestException('Cannot withdraw after draw date');
    }

    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: cmd.tournamentId, userId: cmd.userId } },
    });
    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    if (['withdrawn', 'disqualified', 'champion'].includes(entry.status)) {
      throw new BadRequestException(`Cannot withdraw from status: ${entry.status}`);
    }

    return this.prisma.tournamentEntry.update({
      where: { id: entry.id },
      data: {
        status: 'withdrawn',
        withdrawnAt: now,
      },
    });
  }
}
