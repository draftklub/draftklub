import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface OtherPlayerInput {
  userId: string;
  name: string;
}

export interface CreateBookingCommand {
  klubId: string;
  spaceId: string;
  startsAt: Date;
  endsAt: Date;
  bookingType: 'player_match' | 'player_free_play';
  primaryPlayerId: string;
  otherPlayers: OtherPlayerInput[];
  notes?: string;
  createdById: string;
  createdByIsStaff: boolean;
}

function ranges_overlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

@Injectable()
export class CreateBookingHandler {
  constructor(private readonly prisma: PrismaService) {}

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

    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

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

    if (cmd.endsAt <= cmd.startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    const durationMinutes = (cmd.endsAt.getTime() - cmd.startsAt.getTime()) / 60000;
    if (durationMinutes < 15) {
      throw new BadRequestException('Booking duration must be at least 15 minutes');
    }
    if (cmd.startsAt < new Date()) {
      throw new BadRequestException('Cannot create booking in the past');
    }

    const startMinutes = cmd.startsAt.getUTCHours() * 60 + cmd.startsAt.getUTCMinutes();
    if (startMinutes % space.slotGranularityMinutes !== 0) {
      throw new BadRequestException(
        `Start time must be aligned to ${space.slotGranularityMinutes}-minute boundaries`,
      );
    }

    const startHour = cmd.startsAt.getUTCHours();
    const endHour = cmd.endsAt.getUTCHours();
    const endMinutes = cmd.endsAt.getUTCMinutes();
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
        startsAt: { lt: cmd.endsAt },
        endsAt: { gt: cmd.startsAt },
      },
    });

    if (spaceConflict) {
      throw new ConflictException({
        type: 'space_conflict',
        conflictingBookingId: spaceConflict.id,
        message: `Space already has a booking from ${spaceConflict.startsAt.toISOString()} to ${spaceConflict.endsAt.toISOString()}`,
      });
    }

    const allPlayerIds = [cmd.primaryPlayerId, ...cmd.otherPlayers.map((p) => p.userId)];

    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: cmd.endsAt },
        endsAt: { gt: cmd.startsAt },
        OR: [
          { primaryPlayerId: { in: allPlayerIds } },
          // otherPlayers JSONB: filtra in-memory depois
        ],
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
        if (!ranges_overlap(b.startsAt, b.endsAt, cmd.startsAt, cmd.endsAt)) return false;
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

    // Fetch remaining bookings not captured by primaryPlayerId IN filter but
    // containing any of the player IDs in otherPlayers — handled via a broader
    // time-window query:
    const otherOverlaps = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: cmd.endsAt },
        endsAt: { gt: cmd.startsAt },
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
        endsAt: cmd.endsAt,
        bookingType: cmd.bookingType,
        creationMode,
        status: initialStatus,
        primaryPlayerId: cmd.primaryPlayerId,
        otherPlayers: cmd.otherPlayers as unknown as Prisma.InputJsonValue,
        notes: cmd.notes,
        createdById: cmd.createdById,
        approvedById: initialStatus === 'confirmed' ? cmd.createdById : null,
        approvedAt: initialStatus === 'confirmed' ? new Date() : null,
      },
    });
  }
}
