import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface RejectBookingCommand {
  bookingId: string;
  rejectedById: string;
  reason: string;
}

@Injectable()
export class RejectBookingHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: RejectBookingCommand) {
    const booking = await this.prisma.booking.findUnique({ where: { id: cmd.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending') {
      throw new BadRequestException(`Booking is in status '${booking.status}', cannot reject`);
    }

    return this.prisma.booking.update({
      where: { id: cmd.bookingId },
      data: {
        status: 'cancelled',
        rejectedById: cmd.rejectedById,
        rejectedAt: new Date(),
        rejectionReason: cmd.reason,
      },
    });
  }
}
