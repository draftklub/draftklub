import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { SeriesGeneratorService } from '../../domain/services/series-generator.service';
import {
  HourBandResolverService,
  type HourBand,
  type MatchType,
} from '../../domain/services/hour-band-resolver.service';

const MAX_OCCURRENCES = 100;

export interface OtherPlayerInput {
  userId: string;
  name: string;
}

export interface CreateBookingSeriesCommand {
  klubId: string;
  spaceId: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  daysOfWeek: number[];
  startsOn: Date;
  endsOn: Date;
  startHour: number;
  startMinute: number;
  matchType: MatchType;
  bookingType: 'player_match' | 'player_free_play';
  primaryPlayerId: string;
  otherPlayers: OtherPlayerInput[];
  notes?: string;
  createdById: string;
  createdByIsStaff: boolean;
}

interface ConflictDetail {
  occurrenceStart: string;
  occurrenceEnd: string;
  type: 'space_conflict' | 'player_conflict';
  conflictingBookingId?: string;
  playerId?: string;
}

@Injectable()
export class CreateBookingSeriesHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: SeriesGeneratorService,
    private readonly hourBandResolver: HourBandResolverService,
  ) {}

  async execute(cmd: CreateBookingSeriesCommand) {
    const space = await this.prisma.space.findUnique({ where: { id: cmd.spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.klubId !== cmd.klubId) {
      throw new BadRequestException('Space does not belong to this Klub');
    }
    if (!space.bookingActive || space.status !== 'active') {
      throw new BadRequestException('Space is not available for booking');
    }

    const allowedTypes = (space.allowedMatchTypes as string[]) ?? [];
    if (!allowedTypes.includes(cmd.matchType)) {
      throw new BadRequestException(
        `Space does not allow ${cmd.matchType}. Allowed: ${allowedTypes.join(', ') || '(none)'}`,
      );
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const rangeMs = cmd.endsOn.getTime() - cmd.startsOn.getTime();
    const maxMs = config.maxRecurrenceMonths * 31 * 24 * 60 * 60_000;
    if (rangeMs > maxMs) {
      throw new BadRequestException(
        `Series range exceeds maxRecurrenceMonths (${config.maxRecurrenceMonths})`,
      );
    }

    const allowedModes = config.bookingModes as string[];
    let creationMode: 'direct' | 'staff_approval' | 'staff_assisted';
    let initialStatus: 'pending' | 'confirmed';

    if (cmd.createdByIsStaff) {
      creationMode = 'staff_assisted';
      initialStatus = 'confirmed';
    } else if (allowedModes.includes('direct')) {
      creationMode = 'direct';
      initialStatus = 'confirmed';
    } else if (allowedModes.includes('staff_approval')) {
      creationMode = 'staff_approval';
      initialStatus = 'pending';
    } else if (allowedModes.includes('staff_only')) {
      throw new ForbiddenException('This Klub requires staff to create bookings');
    } else {
      throw new BadRequestException('Klub has no valid booking modes configured');
    }

    if (config.accessMode === 'members_only' && !cmd.createdByIsStaff) {
      const isMember = await this.prisma.membership.findFirst({
        where: { userId: cmd.primaryPlayerId, klubId: cmd.klubId },
      });
      if (!isMember) {
        throw new ForbiddenException('This Klub requires membership to book');
      }
    }

    const hourBands = (space.hourBands as unknown as HourBand[]) ?? [];

    const probeStart = new Date(cmd.startsOn);
    probeStart.setUTCHours(cmd.startHour, cmd.startMinute, 0, 0);
    const probe = this.hourBandResolver.resolve(
      probeStart,
      cmd.matchType,
      hourBands,
      space.slotDefaultDurationMinutes,
    );
    const baseDurationMinutes =
      Math.round((probe.endsAt.getTime() - probeStart.getTime()) / 60_000);

    const occurrences = this.generator.generate({
      startsOn: cmd.startsOn,
      endsOn: cmd.endsOn,
      frequency: cmd.frequency,
      interval: cmd.interval,
      daysOfWeek: cmd.daysOfWeek,
      startHour: cmd.startHour,
      startMinute: cmd.startMinute,
      durationMinutes: baseDurationMinutes,
    });

    if (occurrences.length === 0) {
      throw new BadRequestException('Series generates 0 occurrences');
    }
    if (occurrences.length > MAX_OCCURRENCES) {
      throw new BadRequestException(
        `Series would generate ${occurrences.length} occurrences (max ${MAX_OCCURRENCES})`,
      );
    }

    const resolvedOccurrences = occurrences.map((occ) => {
      const r = this.hourBandResolver.resolve(
        occ.startsAt,
        cmd.matchType,
        hourBands,
        space.slotDefaultDurationMinutes,
      );
      if (cmd.otherPlayers.length > 0 && !this.hourBandResolver.bandAllowsGuests(r.band)) {
        throw new BadRequestException(
          `Occurrence at ${occ.startsAt.toISOString()} falls in '${r.band.type}' band which does not allow guests`,
        );
      }
      return { startsAt: occ.startsAt, endsAt: r.endsAt };
    });

    const allPlayerIds = [cmd.primaryPlayerId, ...cmd.otherPlayers.map((p) => p.userId)];
    const conflicts: ConflictDetail[] = [];

    const firstOcc = resolvedOccurrences[0];
    const lastOcc = resolvedOccurrences[resolvedOccurrences.length - 1];
    if (!firstOcc || !lastOcc) {
      throw new BadRequestException('No occurrences generated');
    }
    const windowStart = firstOcc.startsAt;
    const windowEnd = lastOcc.endsAt;

    const existingInWindow = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: windowEnd },
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }] },
          {
            OR: [
              { spaceId: cmd.spaceId },
              { primaryPlayerId: { in: allPlayerIds } },
            ],
          },
        ],
      },
      select: {
        id: true,
        spaceId: true,
        startsAt: true,
        endsAt: true,
        primaryPlayerId: true,
        otherPlayers: true,
      },
    });

    const existingWithOtherPlayer = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: windowEnd },
        OR: [{ endsAt: null }, { endsAt: { gt: windowStart } }],
      },
      select: {
        id: true,
        spaceId: true,
        startsAt: true,
        endsAt: true,
        primaryPlayerId: true,
        otherPlayers: true,
      },
    });

    const combined = new Map<string, (typeof existingInWindow)[number]>();
    for (const b of [...existingInWindow, ...existingWithOtherPlayer]) {
      combined.set(b.id, b);
    }

    const playerIdSet = new Set(allPlayerIds);

    for (const occ of resolvedOccurrences) {
      for (const existing of combined.values()) {
        const existingEndMs = existing.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const overlaps =
          existing.startsAt.getTime() < occ.endsAt.getTime() &&
          existingEndMs > occ.startsAt.getTime();
        if (!overlaps) continue;

        if (existing.spaceId === cmd.spaceId) {
          conflicts.push({
            occurrenceStart: occ.startsAt.toISOString(),
            occurrenceEnd: occ.endsAt.toISOString(),
            type: 'space_conflict',
            conflictingBookingId: existing.id,
          });
          continue;
        }

        if (existing.primaryPlayerId && playerIdSet.has(existing.primaryPlayerId)) {
          conflicts.push({
            occurrenceStart: occ.startsAt.toISOString(),
            occurrenceEnd: occ.endsAt.toISOString(),
            type: 'player_conflict',
            playerId: existing.primaryPlayerId,
            conflictingBookingId: existing.id,
          });
          continue;
        }

        const others = (existing.otherPlayers as { userId?: string }[] | null) ?? [];
        const matchedOther = others.find((o) => o.userId && playerIdSet.has(o.userId));
        if (matchedOther?.userId) {
          conflicts.push({
            occurrenceStart: occ.startsAt.toISOString(),
            occurrenceEnd: occ.endsAt.toISOString(),
            type: 'player_conflict',
            playerId: matchedOther.userId,
            conflictingBookingId: existing.id,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        type: 'series_conflicts',
        count: conflicts.length,
        conflicts,
        message: `${conflicts.length} occurrence(s) conflict — series rejected atomically`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const series = await tx.bookingSeries.create({
        data: {
          klubId: cmd.klubId,
          spaceId: cmd.spaceId,
          frequency: cmd.frequency,
          interval: cmd.interval,
          daysOfWeek: cmd.daysOfWeek,
          startsOn: cmd.startsOn,
          endsOn: cmd.endsOn,
          durationMinutes: baseDurationMinutes,
          startHour: cmd.startHour,
          startMinute: cmd.startMinute,
          bookingType: cmd.bookingType,
          primaryPlayerId: cmd.primaryPlayerId,
          otherPlayers: cmd.otherPlayers as unknown as Prisma.InputJsonValue,
          notes: cmd.notes,
          createdById: cmd.createdById,
        },
      });

      const created = [];
      for (const occ of resolvedOccurrences) {
        const booking = await tx.booking.create({
          data: {
            klubId: cmd.klubId,
            spaceId: cmd.spaceId,
            startsAt: occ.startsAt,
            endsAt: occ.endsAt,
            matchType: cmd.matchType,
            bookingType: cmd.bookingType,
            creationMode,
            status: initialStatus,
            primaryPlayerId: cmd.primaryPlayerId,
            otherPlayers: cmd.otherPlayers as unknown as Prisma.InputJsonValue,
            extensions: [],
            notes: cmd.notes,
            createdById: cmd.createdById,
            approvedById: initialStatus === 'confirmed' ? cmd.createdById : null,
            approvedAt: initialStatus === 'confirmed' ? new Date() : null,
            bookingSeriesId: series.id,
          },
        });
        created.push(booking);
      }

      return { series, bookings: created };
    });
  }
}
