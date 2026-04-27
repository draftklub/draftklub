import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  HourBandResolverService,
  type HourBand,
  type MatchType,
} from '../../domain/services/hour-band-resolver.service';

export interface SpaceAvailabilitySlot {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked' | 'past' | 'closed';
  bookingId?: string;
  bookingType?: string;
  bandType?: string;
}

const BLOCK_TYPES = new Set(['maintenance', 'weather_closed', 'staff_blocked']);

export interface SpaceAvailabilityResult {
  spaceId: string;
  spaceName: string;
  date: string;
  matchType: MatchType;
  granularityMinutes: number;
  defaultDurationMinutes: number;
  slots: SpaceAvailabilitySlot[];
}

@Injectable()
export class GetSpaceAvailabilityHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hourBandResolver: HourBandResolverService,
  ) {}

  async execute(
    spaceId: string,
    date: string,
    matchType?: MatchType,
  ): Promise<SpaceAvailabilityResult> {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space) throw new NotFoundException('Space not found');

    const allowedTypes = (space.allowedMatchTypes as string[]) ?? [];
    const effectiveMatchType: MatchType =
      (matchType ?? (allowedTypes[0] as MatchType)) || 'singles';
    if (!allowedTypes.includes(effectiveMatchType)) {
      throw new BadRequestException(
        `Space does not allow ${effectiveMatchType}. Allowed: ${allowedTypes.join(', ') || '(none)'}`,
      );
    }

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
        matchType: effectiveMatchType,
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
    const fallbackDurationMs = space.slotDefaultDurationMinutes * 60_000;
    const hourBands = (space.hourBands as unknown as HourBand[]) ?? [];
    const now = Date.now();

    const slots: SpaceAvailabilitySlot[] = [];
    let cursor = dayStart.getTime();
    while (cursor + stepMs <= dayEnd.getTime()) {
      const slotStart = new Date(cursor);

      let durationMs = fallbackDurationMs;
      let bandType: string | undefined;
      let status: SpaceAvailabilitySlot['status'] = 'available';

      try {
        const r = this.hourBandResolver.resolve(
          slotStart,
          effectiveMatchType,
          hourBands,
          space.slotDefaultDurationMinutes,
        );
        durationMs = r.endsAt.getTime() - slotStart.getTime();
        bandType = r.band.type;
      } catch {
        status = 'closed';
      }

      const slotEnd = new Date(cursor + durationMs);
      let bookingId: string | undefined;
      let bookingType: string | undefined;

      if (status !== 'closed') {
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
      }

      slots.push({
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        status,
        bookingId,
        bookingType,
        bandType,
      });

      cursor += stepMs;
    }

    return {
      spaceId,
      spaceName: space.name,
      date,
      matchType: effectiveMatchType,
      granularityMinutes: space.slotGranularityMinutes,
      defaultDurationMinutes: space.slotDefaultDurationMinutes,
      slots,
    };
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
