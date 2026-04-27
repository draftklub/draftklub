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
import { GuestUserService, type GuestInput } from '../../domain/services/guest-user.service';

export interface ExistingPlayerInput {
  userId: string;
}
export interface GuestPlayerInput {
  guest: GuestInput;
}
export type PlayerInput = ExistingPlayerInput | GuestPlayerInput;

export interface CreateBookingCommand {
  klubId: string;
  spaceId: string;
  startsAt: Date;
  matchType: MatchType;
  bookingType: 'player_match' | 'player_free_play';
  primaryPlayerId: string;
  otherPlayers: PlayerInput[];
  responsibleMemberId?: string;
  notes?: string;
  createdById: string;
  createdByIsStaff: boolean;
}

interface ResolvedPlayer {
  userId: string;
  name: string;
}

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date): boolean {
  const aEndMs = aEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  return aStart.getTime() < bEnd.getTime() && aEndMs > bStart.getTime();
}

@Injectable()
export class CreateBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hourBandResolver: HourBandResolverService,
    private readonly guestUserService: GuestUserService,
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
        `Space does not allow ${cmd.matchType}. Allowed: ${allowedTypes.join(', ') || '(none)'}`,
      );
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const startMinutes = cmd.startsAt.getUTCHours() * 60 + cmd.startsAt.getUTCMinutes();
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

    const allowGuestAdd = this.canAddGuests(config.guestsAddedBy, cmd.createdByIsStaff);
    const resolvedOtherPlayers: ResolvedPlayer[] = [];
    for (const player of cmd.otherPlayers) {
      if ('userId' in player) {
        const user = await this.prisma.user.findUnique({ where: { id: player.userId } });
        if (!user) throw new BadRequestException(`User ${player.userId} not found`);
        resolvedOtherPlayers.push({ userId: user.id, name: user.fullName });
      } else {
        if (!allowGuestAdd) {
          throw new ForbiddenException(
            `This Klub does not allow ${cmd.createdByIsStaff ? 'staff' : 'players'} to add guests`,
          );
        }
        const guest = await this.guestUserService.createOrGet(player.guest);
        resolvedOtherPlayers.push({ userId: guest.id, name: guest.fullName });
      }
    }

    if (resolvedOtherPlayers.length > 0 && !this.hourBandResolver.bandAllowsGuests(band)) {
      throw new BadRequestException(`Band '${band.type}' does not allow guests/other players`);
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

    const allUserIds = [cmd.primaryPlayerId, ...resolvedOtherPlayers.map((p) => p.userId)];

    if (config.accessMode === 'members_only' && !cmd.createdByIsStaff) {
      const memberships = await this.prisma.membership.findMany({
        where: {
          userId: { in: allUserIds },
          klubId: cmd.klubId,
          status: 'active',
        },
        select: { userId: true },
      });
      if (memberships.length === 0) {
        throw new BadRequestException(
          'In members_only Klub, at least one member must be in the booking',
        );
      }
    }

    let responsibleMemberId = cmd.responsibleMemberId;

    if (config.accessMode === 'members_only') {
      if (!responsibleMemberId) {
        const primaryIsMember = await this.prisma.membership.findFirst({
          where: {
            userId: cmd.primaryPlayerId,
            klubId: cmd.klubId,
            status: 'active',
          },
          select: { userId: true },
        });
        if (primaryIsMember) {
          responsibleMemberId = cmd.primaryPlayerId;
        } else {
          const memberOther = await this.findFirstMember(
            resolvedOtherPlayers.map((p) => p.userId),
            cmd.klubId,
          );
          if (!memberOther) {
            throw new BadRequestException(
              'In members_only Klub with non-member primary, must specify responsibleMemberId',
            );
          }
          responsibleMemberId = memberOther;
        }
      } else {
        const isMember = await this.prisma.membership.findFirst({
          where: {
            userId: responsibleMemberId,
            klubId: cmd.klubId,
            status: 'active',
          },
          select: { id: true },
        });
        if (!isMember) {
          throw new BadRequestException(
            'responsibleMemberId must be an active member of this Klub',
          );
        }
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

    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: endsAt },
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: cmd.startsAt } }] }],
        primaryPlayerId: { in: allUserIds },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        primaryPlayerId: true,
        otherPlayers: true,
      },
    });

    const playerIdSet = new Set(allUserIds);
    for (const pid of allUserIds) {
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
    for (const pid of allUserIds) {
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
        otherPlayers: resolvedOtherPlayers as unknown as Prisma.InputJsonValue,
        responsibleMemberId: responsibleMemberId ?? null,
        extensions: [],
        notes: cmd.notes,
        createdById: cmd.createdById,
        approvedById: initialStatus === 'confirmed' ? cmd.createdById : null,
        approvedAt: initialStatus === 'confirmed' ? new Date() : null,
      },
    });
  }

  private canAddGuests(mode: string, isStaff: boolean): boolean {
    if (mode === 'both') return true;
    if (mode === 'player' && !isStaff) return true;
    if (mode === 'staff' && isStaff) return true;
    return false;
  }

  private async findFirstMember(userIds: string[], klubId: string): Promise<string | null> {
    if (userIds.length === 0) return null;
    const m = await this.prisma.membership.findFirst({
      where: { userId: { in: userIds }, klubId, status: 'active' },
      select: { userId: true },
    });
    return m?.userId ?? null;
  }
}
