import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ApproveBookingCommand {
  bookingId: string;
  approvedById: string;
  notes?: string;
}

@Injectable()
export class ApproveBookingHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApproveBookingCommand) {
    const booking = await this.prisma.booking.findUnique({ where: { id: cmd.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending') {
      throw new BadRequestException(`Booking is in status '${booking.status}', cannot approve`);
    }

    if (!booking.endsAt) {
      throw new BadRequestException('Cannot approve booking with null endsAt');
    }

    const conflict = await this.prisma.booking.findFirst({
      where: {
        spaceId: booking.spaceId,
        id: { not: booking.id },
        status: 'confirmed',
        startsAt: { lt: booking.endsAt },
        OR: [{ endsAt: null }, { endsAt: { gt: booking.startsAt } }],
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException({
        type: 'space_conflict',
        conflictingBookingId: conflict.id,
        message: 'Cannot approve: space already has a confirmed booking at this time',
      });
    }

    const appendedNotes = cmd.notes
      ? `${booking.notes ?? ''}\n[Approval] ${cmd.notes}`.trim()
      : booking.notes;

    return this.prisma.booking.update({
      where: { id: cmd.bookingId },
      data: {
        status: 'confirmed',
        approvedById: cmd.approvedById,
        approvedAt: new Date(),
        notes: appendedNotes,
      },
    });
  }
}
