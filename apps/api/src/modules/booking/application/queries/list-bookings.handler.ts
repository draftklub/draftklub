import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ListBookingsFilters {
  klubId: string;
  spaceId?: string;
  startsAfter?: Date;
  startsBefore?: Date;
  status?: string;
  primaryPlayerId?: string;
}

@Injectable()
export class ListBookingsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: ListBookingsFilters) {
    return this.prisma.booking.findMany({
      where: {
        klubId: filters.klubId,
        ...(filters.spaceId ? { spaceId: filters.spaceId } : {}),
        ...(filters.status
          ? {
              status: filters.status as
                | 'pending'
                | 'confirmed'
                | 'cancelled'
                | 'no_show'
                | 'completed',
            }
          : {}),
        ...(filters.primaryPlayerId ? { primaryPlayerId: filters.primaryPlayerId } : {}),
        ...(filters.startsAfter || filters.startsBefore
          ? {
              startsAt: {
                ...(filters.startsAfter ? { gte: filters.startsAfter } : {}),
                ...(filters.startsBefore ? { lte: filters.startsBefore } : {}),
              },
            }
          : {}),
      },
      include: {
        space: { select: { id: true, name: true, type: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
