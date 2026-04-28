import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { GuestUserService, type GuestInput } from '../../domain/services/guest-user.service';

export interface ExistingPlayerInput {
  userId: string;
}
export interface GuestPlayerInput {
  guest: GuestInput;
}
export type PlayerInput = ExistingPlayerInput | GuestPlayerInput;

export interface AddPlayersToBookingCommand {
  bookingId: string;
  players: PlayerInput[];
  requestedById: string;
  isStaff: boolean;
}

interface ResolvedPlayer {
  userId: string;
  name: string;
}

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndMs = aEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEndMs = bEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  return aStart.getTime() < bEndMs && aEndMs > bStart.getTime();
}

/**
 * Sprint Polish PR-C — adicionar players a uma reserva já criada.
 *
 * Permissão: só primary player OU staff (KLUB_ADMIN/STAFF/SUPER_ADMIN).
 * Valida overlap, capacidade (singles=2, doubles=4 total), guest policy
 * via KlubConfig.guestsAddedBy, e booking ainda em estado válido.
 *
 * Não emite OutboxEvent — fan-out de email pra players novos fica pra
 * PR posterior (precisa template novo + handled event type no
 * OutboxProcessor).
 */
@Injectable()
export class AddPlayersToBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guestUserService: GuestUserService,
  ) {}

  async execute(cmd: AddPlayersToBookingCommand) {
    if (cmd.players.length === 0) {
      throw new BadRequestException('At least one player must be provided');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
    });
    if (!booking || booking.deletedAt) throw new NotFoundException('Booking not found');

    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      throw new BadRequestException(`Cannot add players to a ${booking.status} booking`);
    }
    if (booking.startsAt < new Date()) {
      throw new BadRequestException('Cannot add players to a booking that already started');
    }
    if (booking.bookingType === 'tournament_match') {
      throw new ForbiddenException('Tournament match bookings cannot be modified directly');
    }

    const isPrimary = booking.primaryPlayerId === cmd.requestedById;
    if (!isPrimary && !cmd.isStaff) {
      throw new ForbiddenException('Only the primary player or staff can add players to a booking');
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: booking.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const existingOthers = (booking.otherPlayers as { userId?: string }[] | null) ?? [];
    const existingIds = new Set(
      existingOthers.map((p) => p.userId).filter((id): id is string => Boolean(id)),
    );
    if (booking.primaryPlayerId) existingIds.add(booking.primaryPlayerId);

    const allowGuestAdd = this.canAddGuests(config.guestsAddedBy, cmd.isStaff);
    const resolved: ResolvedPlayer[] = [];
    for (const p of cmd.players) {
      if ('userId' in p) {
        const user = await this.prisma.user.findUnique({ where: { id: p.userId } });
        if (!user) throw new BadRequestException(`User ${p.userId} not found`);
        resolved.push({ userId: user.id, name: user.fullName });
      } else {
        if (!allowGuestAdd) {
          throw new ForbiddenException(
            `This Klub does not allow ${cmd.isStaff ? 'staff' : 'players'} to add guests`,
          );
        }
        const guest = await this.guestUserService.createOrGet(p.guest);
        resolved.push({ userId: guest.id, name: guest.fullName });
      }
    }

    for (const r of resolved) {
      if (existingIds.has(r.userId)) {
        throw new ConflictException({
          type: 'player_already_in_booking',
          playerId: r.userId,
          message: `Player ${r.name} is already in this booking`,
        });
      }
    }

    const totalCount = existingIds.size + resolved.length;
    const maxPlayers = booking.matchType === 'doubles' ? 4 : 2;
    if (totalCount > maxPlayers) {
      throw new BadRequestException(
        `Booking is ${booking.matchType ?? 'singles'} (max ${maxPlayers} players). Already has ${existingIds.size}, cannot add ${resolved.length}`,
      );
    }

    const newIds = resolved.map((r) => r.userId);
    const overlaps = await this.prisma.booking.findMany({
      where: {
        id: { not: booking.id },
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: booking.endsAt ?? new Date(booking.startsAt.getTime() + 24 * 3_600_000) },
        OR: [{ endsAt: null }, { endsAt: { gt: booking.startsAt } }],
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        primaryPlayerId: true,
        otherPlayers: true,
      },
    });
    for (const pid of newIds) {
      const conflict = overlaps.find((b) => {
        if (!rangesOverlap(b.startsAt, b.endsAt, booking.startsAt, booking.endsAt)) return false;
        if (b.primaryPlayerId === pid) return true;
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

    const merged = [...existingOthers, ...resolved];

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        otherPlayers: merged,
      },
    });
  }

  private canAddGuests(mode: string, isStaff: boolean): boolean {
    if (mode === 'both') return true;
    if (mode === 'player' && !isStaff) return true;
    if (mode === 'staff' && isStaff) return true;
    return false;
  }
}
