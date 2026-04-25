import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CancelBookingSeriesCommand {
  seriesId: string;
  mode: 'this_only' | 'this_and_future' | 'all';
  bookingId?: string;
  cancelledById: string;
  isStaff: boolean;
  reason?: string;
}

@Injectable()
export class CancelBookingSeriesHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CancelBookingSeriesCommand) {
    const series = await this.prisma.bookingSeries.findUnique({
      where: { id: cmd.seriesId },
    });
    if (!series) throw new NotFoundException('Series not found');

    const isCreator = series.createdById === cmd.cancelledById;
    if (!cmd.isStaff && !isCreator) {
      throw new ForbiddenException('Only series creator or staff can cancel');
    }

    if (cmd.mode !== 'all' && !cmd.bookingId) {
      throw new BadRequestException(
        `mode '${cmd.mode}' requires bookingId in the request body`,
      );
    }

    if (cmd.mode === 'this_only') {
      const booking = await this.prisma.booking.findUnique({
        where: { id: cmd.bookingId ?? '' },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.bookingSeriesId !== cmd.seriesId) {
        throw new BadRequestException('Booking does not belong to this series');
      }
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new BadRequestException(
          `Cannot cancel booking in status '${booking.status}'`,
        );
      }

      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          cancelledById: cmd.cancelledById,
          cancelledAt: new Date(),
          cancellationReason: cmd.reason ?? 'series_this_only',
        },
      });
      return { cancelled: [updated.id], seriesStatus: series.status };
    }

    if (cmd.mode === 'this_and_future') {
      const pivot = await this.prisma.booking.findUnique({
        where: { id: cmd.bookingId ?? '' },
      });
      if (!pivot) throw new NotFoundException('Booking not found');
      if (pivot.bookingSeriesId !== cmd.seriesId) {
        throw new BadRequestException('Booking does not belong to this series');
      }

      const toCancel = await this.prisma.booking.findMany({
        where: {
          bookingSeriesId: cmd.seriesId,
          startsAt: { gte: pivot.startsAt },
          status: { in: ['pending', 'confirmed'] },
        },
        select: { id: true },
      });

      return this.prisma.$transaction(async (tx) => {
        const now = new Date();
        for (const b of toCancel) {
          await tx.booking.update({
            where: { id: b.id },
            data: {
              status: 'cancelled',
              cancelledById: cmd.cancelledById,
              cancelledAt: now,
              cancellationReason: cmd.reason ?? 'series_this_and_future',
            },
          });
        }
        await tx.bookingSeries.update({
          where: { id: cmd.seriesId },
          data: { endsOn: pivot.startsAt },
        });
        return {
          cancelled: toCancel.map((b) => b.id),
          seriesStatus: 'active',
          newSeriesEndsOn: pivot.startsAt.toISOString(),
        };
      });
    }

    // mode === 'all'
    const toCancel = await this.prisma.booking.findMany({
      where: {
        bookingSeriesId: cmd.seriesId,
        status: { in: ['pending', 'confirmed'] },
      },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      for (const b of toCancel) {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            status: 'cancelled',
            cancelledById: cmd.cancelledById,
            cancelledAt: now,
            cancellationReason: cmd.reason ?? 'series_all',
          },
        });
      }
      await tx.bookingSeries.update({
        where: { id: cmd.seriesId },
        data: {
          status: 'cancelled',
          cancelledById: cmd.cancelledById,
          cancelledAt: now,
          cancellationReason: cmd.reason ?? 'series_all',
        },
      });
      return { cancelled: toCancel.map((b) => b.id), seriesStatus: 'cancelled' };
    });
  }
}
