import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface SpaceAvailabilitySlot {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked' | 'past' | 'closed';
  bookingId?: string;
  bookingType?: string;
}

const BLOCK_TYPES = new Set(['maintenance', 'weather_closed', 'staff_blocked']);

export interface SpaceAvailabilityResult {
  spaceId: string;
  spaceName: string;
  date: string;
  granularityMinutes: number;
  defaultDurationMinutes: number;
  slots: SpaceAvailabilitySlot[];
}

@Injectable()
export class GetSpaceAvailabilityHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(spaceId: string, date: string): Promise<SpaceAvailabilityResult> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space) throw new NotFoundException('Space not found');

    const klub = await this.prisma.klub.findUnique({
      where: { id: space.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new NotFoundException('Klub config missing');

    const dayStart = new Date(`${date}T${pad2(config.openingHour)}:00:00.000Z`);
    const dayEnd = new Date(`${date}T${pad2(config.closingHour)}:00:00.000Z`);

    const rawDay = dayStart.getUTCDay();
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;
    const openDays = config.openDays.split(',').map((d) => parseInt(d, 10));
    const isOpen = openDays.includes(dayOfWeek);

    if (!isOpen) {
      return {
        spaceId,
        spaceName: space.name,
        date,
        granularityMinutes: space.slotGranularityMinutes,
        defaultDurationMinutes: space.slotDefaultDurationMinutes,
        slots: [],
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        spaceId,
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: dayEnd },
        OR: [{ endsAt: null }, { endsAt: { gt: dayStart } }],
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        bookingType: true,
      },
    });

    const stepMs = space.slotGranularityMinutes * 60_000;
    const durationMs = space.slotDefaultDurationMinutes * 60_000;
    const now = Date.now();

    const slots: SpaceAvailabilitySlot[] = [];
    let cursor = dayStart.getTime();
    while (cursor + durationMs <= dayEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + durationMs);

      let status: SpaceAvailabilitySlot['status'] = 'available';
      let bookingId: string | undefined;
      let bookingType: string | undefined;

      if (cursor < now) {
        status = 'past';
      } else {
        const overlapping = bookings.find((b) => {
          if (b.startsAt.getTime() >= slotEnd.getTime()) return false;
          const bookingEndMs = b.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
          return bookingEndMs > slotStart.getTime();
        });
        if (overlapping) {
          status = BLOCK_TYPES.has(overlapping.bookingType) ? 'blocked' : 'booked';
          bookingId = overlapping.id;
          bookingType = overlapping.bookingType;
        }
      }

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        status,
        bookingId,
        bookingType,
      });

      cursor += stepMs;
    }

    return {
      spaceId,
      spaceName: space.name,
      date,
      granularityMinutes: space.slotGranularityMinutes,
      defaultDurationMinutes: space.slotDefaultDurationMinutes,
      slots,
    };
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
