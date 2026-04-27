import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CloseOperationalBlockCommand {
  bookingId: string;
  closedById: string;
  endsAt?: Date;
}

@Injectable()
export class CloseOperationalBlockHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CloseOperationalBlockCommand) {
    const block = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.bookingType !== 'weather_closed') {
      throw new BadRequestException(
        `Only weather_closed blocks can be closed (got '${block.bookingType}')`,
      );
    }
    if (block.endsAt) {
      throw new BadRequestException('Block already has endsAt — already closed');
    }

    const effectiveEnd = cmd.endsAt ?? new Date();
    if (effectiveEnd <= block.startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.prisma.booking.update({
      where: { id: cmd.bookingId },
      data: {
        endsAt: effectiveEnd,
        status: 'completed',
      },
    });
  }
}
