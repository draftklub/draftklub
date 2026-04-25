import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { BookingExtension } from './extend-booking.handler';

export interface ApproveExtensionCommand {
  bookingId: string;
  extensionId: string;
  approvedById: string;
}

@Injectable()
export class ApproveExtensionHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApproveExtensionCommand) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const extensions = (booking.extensions as unknown as BookingExtension[]) ?? [];
    const extension = extensions.find((e) => e.id === cmd.extensionId);
    if (!extension) throw new NotFoundException('Extension not found');
    if (extension.status !== 'pending') {
      throw new BadRequestException(
        `Extension is in status '${extension.status}', cannot approve`,
      );
    }
    if (!booking.endsAt) {
      throw new BadRequestException('Cannot approve extension without booking endsAt');
    }

    const newEndsAt = new Date(extension.extendedTo);

    const conflict = await this.prisma.booking.findFirst({
      where: {
        spaceId: booking.spaceId,
        id: { not: booking.id },
        status: 'confirmed',
        startsAt: { lt: newEndsAt },
        OR: [{ endsAt: null }, { endsAt: { gt: booking.endsAt } }],
      },
    });
    if (conflict) {
      throw new ConflictException({
        type: 'space_conflict',
        conflictingBookingId: conflict.id,
        message: 'Cannot approve: space already booked',
      });
    }

    const now = new Date().toISOString();
    const updated = extensions.map((e) =>
      e.id === cmd.extensionId
        ? {
            ...e,
            status: 'approved' as const,
            decidedById: cmd.approvedById,
            decidedAt: now,
          }
        : e,
    );

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        endsAt: newEndsAt,
        extensions: updated as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
