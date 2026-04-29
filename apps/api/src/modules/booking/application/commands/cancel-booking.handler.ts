import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { MetricsService } from '../../../../shared/metrics/metrics.service';

export interface CancelBookingCommand {
  bookingId: string;
  cancelledById: string;
  isStaff: boolean;
  reason?: string;
}

interface OtherPlayer {
  userId?: string;
}

@Injectable()
export class CancelBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(cmd: CancelBookingCommand) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel booking in status '${booking.status}'`);
    }

    if (booking.bookingType === 'tournament_match' && !cmd.isStaff) {
      throw new ForbiddenException(
        'Tournament match bookings cannot be cancelled directly. Contact staff or cancel via tournament.',
      );
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: booking.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const isPrimaryPlayer = booking.primaryPlayerId === cmd.cancelledById;
    const others = (booking.otherPlayers as OtherPlayer[] | null) ?? [];
    const isInOtherPlayers = others.some((p) => p.userId === cmd.cancelledById);
    const isParticipant = isPrimaryPlayer || isInOtherPlayers;

    if (cmd.isStaff) {
      // Staff sempre pode cancelar
    } else if (config.cancellationMode === 'staff_only') {
      throw new ForbiddenException('Only staff can cancel bookings in this Klub');
    } else if (!isParticipant) {
      throw new ForbiddenException('Only participants or staff can cancel');
    } else if (config.cancellationMode === 'with_deadline') {
      const hoursUntilStart = (booking.startsAt.getTime() - Date.now()) / 3_600_000;
      if (hoursUntilStart < config.cancellationWindowHours) {
        throw new BadRequestException(
          `Cancellation deadline passed (must be ${config.cancellationWindowHours}h before start)`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: cmd.bookingId },
        data: {
          status: 'cancelled',
          cancelledById: cmd.cancelledById,
          cancelledAt: new Date(),
          cancellationReason: cmd.reason,
        },
      });

      // Sprint Notifications PR4 — outbox pra worker disparar email.
      const space = await tx.space.findUnique({
        where: { id: booking.spaceId },
        select: { name: true },
      });
      await tx.outboxEvent.create({
        data: {
          eventType: 'booking.cancelled',
          payload: {
            bookingId: booking.id,
            klubId: booking.klubId,
            klubName: klub?.name ?? '',
            klubSlug: klub?.slug ?? '',
            spaceName: space?.name ?? '',
            startsAt: booking.startsAt.toISOString(),
            endsAt: booking.endsAt?.toISOString() ?? null,
            primaryPlayerId: booking.primaryPlayerId,
            cancelledById: cmd.cancelledById,
            cancelledByIsStaff: cmd.isStaff,
            reason: cmd.reason ?? null,
          },
        },
      });

      return updated;
    });
    this.metrics.bookingCancelled(booking.klubId);
    return result;
  }
}
