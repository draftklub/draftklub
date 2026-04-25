import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  HourBandResolverService,
  type HourBand,
  type MatchType,
} from '../../domain/services/hour-band-resolver.service';

export interface OtherPlayerInput {
  userId: string;
  name: string;
}

export interface CreateBookingCommand {
  klubId: string;
  spaceId: string;
  startsAt: Date;
  matchType: MatchType;
  bookingType: 'player_match' | 'player_free_play';
  primaryPlayerId: string;
  otherPlayers: OtherPlayerInput[];
  notes?: string;
  createdById: string;
  createdByIsStaff: boolean;
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date,
): boolean {
  const aEndMs = aEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  return aStart.getTime() < bEnd.getTime() && aEndMs > bStart.getTime();
}

@Injectable()
export class CreateBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hourBandResolver: HourBandResolverService,
  ) {}

  async execute(cmd: CreateBookingCommand) {
    const space = await this.prisma.space.findUnique({
      where: { id: cmd.spaceId },
    });
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
        `Space does not allow ${cmd.matchType}. Allowed: ${allowedTypes.join(', ') || '(none configured)'}`,
      );
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const startMinutes =
      cmd.startsAt.getUTCHours() * 60 + cmd.startsAt.getUTCMinutes();
    if (startMinutes % space.slotGranularityMinutes !== 0) {
      throw new BadRequestException(
        `Start time must be aligned to ${space.slotGranularityMinutes}-minute boundaries`,
      );
    }

    const { band, endsAt } = this.hourBandResolver.resolve(
      cmd.startsAt,
      cmd.matchType,
      (space.hourBands as unknown as HourBand[]) ?? [],
      space.slotDefaultDurationMinutes,
    );

    if (
      cmd.otherPlayers.length > 0 &&
      !this.hourBandResolver.bandAllowsGuests(band)
    ) {
      throw new BadRequestException(
        `Band '${band.type}' does not allow guests/other players`,
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

    if (cmd.startsAt < new Date()) {
      throw new BadRequestException('Cannot create booking in the past');
    }

    const startHour = cmd.startsAt.getUTCHours();
    const endHour = endsAt.getUTCHours();
    const endMinutes = endsAt.getUTCMinutes();
    const effectiveEndHour = endMinutes === 0 ? endHour : endHour + 1;
    if (startHour < config.openingHour || effectiveEndHour > config.closingHour) {
      throw new BadRequestException(
        `Booking must be within Klub hours (${config.openingHour}-${config.closingHour})`,
      );
    }
    const rawDay = cmd.startsAt.getUTCDay();
    const dayOfWeek = rawDay === 0 ? 7 : rawDay;
    const openDays = config.openDays.split(',').map((d) => parseInt(d, 10));
    if (!openDays.includes(dayOfWeek)) {
      throw new BadRequestException('Klub is closed on this day');
    }

    if (config.accessMode === 'members_only' && !cmd.createdByIsStaff) {
      const isMember = await this.prisma.membership.findFirst({
        where: { userId: cmd.primaryPlayerId, klubId: cmd.klubId },
      });
      if (!isMember) {
        throw new ForbiddenException('This Klub requires membership to book');
      }
    }

    const spaceConflict = await this.prisma.booking.findFirst({
      where: {
        spaceId: cmd.spaceId,
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: endsAt },
        OR: [{ endsAt: null }, { endsAt: { gt: cmd.startsAt } }],
      },
    });

    if (spaceConflict) {
      throw new ConflictException({
        type: 'space_conflict',
        conflictingBookingId: spaceConflict.id,
        message: `Space already has a booking from ${spaceConflict.startsAt.toISOString()} to ${spaceConflict.endsAt?.toISOString() ?? 'open-ended'}`,
      });
    }

    const allPlayerIds = [
      cmd.primaryPlayerId,
      ...cmd.otherPlayers.map((p) => p.userId),
    ];

    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: endsAt },
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gt: cmd.startsAt } }],
          },
        ],
        primaryPlayerId: { in: allPlayerIds },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        primaryPlayerId: true,
        otherPlayers: true,
      },
    });

    const playerIdSet = new Set(allPlayerIds);
    for (const pid of allPlayerIds) {
      const conflict = overlappingBookings.find((b) => {
        if (!rangesOverlap(b.startsAt, b.endsAt, cmd.startsAt, endsAt)) return false;
        if (b.primaryPlayerId && playerIdSet.has(b.primaryPlayerId)) return true;
        const others = (b.otherPlayers as { userId?: string }[] | null) ?? [];
        return others.some((o) => o.userId === pid);
      });
      if (conflict) {
        throw new ConflictException({
          type: 'player_conflict',
          playerId: pid,
          conflictingBookingId: conflict.id,
          message: `Player ${pid} has another booking at this time`,
        });
      }
    }

    const otherOverlaps = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: endsAt },
        OR: [{ endsAt: null }, { endsAt: { gt: cmd.startsAt } }],
      },
      select: { id: true, otherPlayers: true },
    });

    for (const pid of allPlayerIds) {
      const conflict = otherOverlaps.find((b) => {
        const others = (b.otherPlayers as { userId?: string }[] | null) ?? [];
        return others.some((o) => o.userId === pid);
      });
      if (conflict) {
        throw new ConflictException({
          type: 'player_conflict',
          playerId: pid,
          conflictingBookingId: conflict.id,
          message: `Player ${pid} has another booking at this time`,
        });
      }
    }

    return this.prisma.booking.create({
      data: {
        klubId: cmd.klubId,
        spaceId: cmd.spaceId,
        startsAt: cmd.startsAt,
        endsAt,
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
      },
    });
  }
}
