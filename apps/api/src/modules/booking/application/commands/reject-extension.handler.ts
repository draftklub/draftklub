import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { BookingExtension } from './extend-booking.handler';

export interface RejectExtensionCommand {
  bookingId: string;
  extensionId: string;
  rejectedById: string;
  reason?: string;
}

@Injectable()
export class RejectExtensionHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: RejectExtensionCommand) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const extensions = (booking.extensions as unknown as BookingExtension[]) ?? [];
    const extension = extensions.find((e) => e.id === cmd.extensionId);
    if (!extension) throw new NotFoundException('Extension not found');
    if (extension.status !== 'pending') {
      throw new BadRequestException(
        `Extension is in status '${extension.status}', cannot reject`,
      );
    }

    const now = new Date().toISOString();
    const updated = extensions.map((e) =>
      e.id === cmd.extensionId
        ? {
            ...e,
            status: 'rejected' as const,
            decidedById: cmd.rejectedById,
            decidedAt: now,
            ...(cmd.reason ? { decisionReason: cmd.reason } : {}),
          }
        : e,
    );

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        extensions: updated as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
