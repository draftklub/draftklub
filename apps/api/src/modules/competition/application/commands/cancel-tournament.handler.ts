import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CancelTournamentCommand {
  tournamentId: string;
  cancelledById: string;
  reason?: string;
}

const CANCELLABLE_STATUSES = ['draft', 'prequalifying', 'in_progress'];

@Injectable()
export class CancelTournamentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CancelTournamentCommand) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      include: { matches: { select: { id: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    if (!CANCELLABLE_STATUSES.includes(tournament.status)) {
      throw new BadRequestException(
        `Tournament in status '${tournament.status}' cannot be cancelled`,
      );
    }

    const now = new Date();
    const cancellationReason = `tournament_cancelled:${cmd.tournamentId}`;
    const matchIds = tournament.matches.map((m) => m.id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tournament.update({
        where: { id: cmd.tournamentId },
        data: {
          status: 'cancelled',
          cancelledAt: now,
          cancelledById: cmd.cancelledById,
          cancellationReason: cmd.reason ?? 'Cancelled by committee',
        },
      });

      const cancelledBookings =
        matchIds.length > 0
          ? await tx.booking.findMany({
              where: {
                tournamentMatchId: { in: matchIds },
                status: { in: ['pending', 'confirmed'] },
              },
              select: { id: true },
            })
          : [];

      if (cancelledBookings.length > 0) {
        await tx.booking.updateMany({
          where: {
            tournamentMatchId: { in: matchIds },
            status: { in: ['pending', 'confirmed'] },
          },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            cancelledById: cmd.cancelledById,
            cancellationReason,
          },
        });
      }

      return {
        tournament: updated,
        cancelledBookings: cancelledBookings.map((b) => b.id),
      };
    });
  }
}
