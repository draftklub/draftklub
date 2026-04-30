import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { ScheduleConfigSchema, type ScheduleConfig } from '../../api/dtos/schedule-config.dto';

export interface Slot {
  date: string;
  startTime: Date;
  endTime: Date;
  spaceId: string;
}

export interface MatchToSchedule {
  id: string;
  player1Id: string;
  player2Id: string;
  round: number;
  bracketPosition: string;
}

export interface ScheduledMatch {
  matchId: string;
  startTime: Date;
  endTime: Date;
  spaceId: string;
  warning?: string;
}

export interface UnscheduledMatch {
  matchId: string;
  reason: string;
}

export interface ConflictPending {
  tournamentMatchId: string;
  avulsoBookingId: string;
  proposedSlot: Slot;
}

export interface DistributionResult {
  scheduled: ScheduledMatch[];
  unscheduled: UnscheduledMatch[];
  bookingsCreated?: string[];
  bookingsUpdated?: string[];
  bookingsAutoCancelled?: string[];
  conflictsToResolve?: ConflictPending[];
}

export interface KlubHours {
  openingHour: number;
  closingHour: number;
}

const MS_PER_MINUTE = 60_000;

@Injectable()
export class ScheduleDistributorService {
  constructor(private readonly prisma: PrismaService) {}

  generateSlots(config: ScheduleConfig): Slot[] {
    const slots: Slot[] = [];
    const stepMs =
      (config.matchDurationMinutes + config.breakBetweenMatchesMinutes) * MS_PER_MINUTE;
    const durationMs = config.matchDurationMinutes * MS_PER_MINUTE;

    for (const date of config.availableDates) {
      const startStr = `${date}T${pad2(config.startHour)}:00:00.000Z`;
      const endStr = `${date}T${pad2(config.endHour)}:00:00.000Z`;
      const dayStartMs = Date.parse(startStr);
      const dayEndMs = Date.parse(endStr);

      let cursor = dayStartMs;
      while (cursor + durationMs <= dayEndMs) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor + durationMs);
        for (const spaceId of config.spaceIds) {
          slots.push({ date, startTime: slotStart, endTime: slotEnd, spaceId });
        }
        cursor += stepMs;
      }
    }

    slots.sort((a, b) => {
      const t = a.startTime.getTime() - b.startTime.getTime();
      if (t !== 0) return t;
      return a.spaceId.localeCompare(b.spaceId);
    });

    return slots;
  }

  assignMatchesToSlots(
    matches: MatchToSchedule[],
    slots: Slot[],
    config: ScheduleConfig,
    klubHours?: KlubHours,
  ): DistributionResult {
    const usedSpaceSlots = new Set<string>();
    const usedPlayerTimes = new Set<string>();
    const playerLastEnd = new Map<string, Date>();
    const restMs = config.restRuleMinutes * MS_PER_MINUTE;

    const scheduled: ScheduledMatch[] = [];
    const unscheduled: UnscheduledMatch[] = [];

    const sortedMatches = [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.bracketPosition.localeCompare(b.bracketPosition);
    });

    for (const match of sortedMatches) {
      let chosenSlot: Slot | null = null;

      for (const slot of slots) {
        const slotKey = `${slot.spaceId}:${slot.startTime.toISOString()}`;
        if (usedSpaceSlots.has(slotKey)) continue;

        const p1Key = `${match.player1Id}:${slot.startTime.toISOString()}`;
        const p2Key = `${match.player2Id}:${slot.startTime.toISOString()}`;
        if (usedPlayerTimes.has(p1Key) || usedPlayerTimes.has(p2Key)) continue;

        if (restMs > 0) {
          const lastP1 = playerLastEnd.get(match.player1Id);
          if (lastP1 && slot.startTime.getTime() - lastP1.getTime() < restMs) continue;
          const lastP2 = playerLastEnd.get(match.player2Id);
          if (lastP2 && slot.startTime.getTime() - lastP2.getTime() < restMs) continue;
        }

        chosenSlot = slot;
        break;
      }

      if (!chosenSlot) {
        unscheduled.push({ matchId: match.id, reason: 'no available slot' });
        continue;
      }

      const slotKey = `${chosenSlot.spaceId}:${chosenSlot.startTime.toISOString()}`;
      usedSpaceSlots.add(slotKey);
      usedPlayerTimes.add(`${match.player1Id}:${chosenSlot.startTime.toISOString()}`);
      usedPlayerTimes.add(`${match.player2Id}:${chosenSlot.startTime.toISOString()}`);
      playerLastEnd.set(match.player1Id, chosenSlot.endTime);
      playerLastEnd.set(match.player2Id, chosenSlot.endTime);

      const warning = klubHours ? this.checkKlubHoursWarning(chosenSlot, klubHours) : undefined;

      scheduled.push({
        matchId: match.id,
        startTime: chosenSlot.startTime,
        endTime: chosenSlot.endTime,
        spaceId: chosenSlot.spaceId,
        warning,
      });
    }

    return { scheduled, unscheduled };
  }

  async distribute(tournamentId: string): Promise<DistributionResult> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        klubSport: { include: { klub: { include: { config: true } } } },
        matches: {
          where: { isBye: false, scheduledFor: null },
          orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    const config = ScheduleConfigSchema.parse(tournament.scheduleConfig);

    const klubHours: KlubHours | undefined = tournament.klubSport.klub.config
      ? {
          openingHour: tournament.klubSport.klub.config.openingHour,
          closingHour: tournament.klubSport.klub.config.closingHour,
        }
      : undefined;

    const matchesToSchedule: MatchToSchedule[] = tournament.matches
      .filter(
        (m): m is typeof m & { player1Id: string; player2Id: string } =>
          m.player1Id != null && m.player2Id != null,
      )
      .map((m) => ({
        id: m.id,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        round: m.round,
        bracketPosition: m.bracketPosition,
      }));

    const skipped: UnscheduledMatch[] = tournament.matches
      .filter((m) => m.player1Id == null || m.player2Id == null)
      .map((m) => ({ matchId: m.id, reason: 'undefined players (TBD)' }));

    const slots = this.generateSlots(config);

    if (slots.length === 0) {
      throw new BadRequestException('No slots generated; check scheduleConfig');
    }

    const { scheduled, unscheduled } = this.assignMatchesToSlots(
      matchesToSchedule,
      slots,
      config,
      klubHours,
    );

    const conflictMode =
      tournament.klubSport.klub.config?.tournamentBookingConflictMode ?? 'staff_decides';
    const klubId = tournament.klubSport.klubId;
    const tournamentCreatedById = tournament.createdById;

    const sideEffects = await this.prisma.$transaction(async (tx) => {
      const bookingsCreated: string[] = [];
      const bookingsUpdated: string[] = [];
      const bookingsAutoCancelled: string[] = [];
      const conflictsToResolve: ConflictPending[] = [];

      for (const sched of scheduled) {
        await tx.tournamentMatch.update({
          where: { id: sched.matchId },
          data: {
            scheduledFor: sched.startTime,
            spaceId: sched.spaceId,
            scheduleWarning: sched.warning ?? null,
          },
        });

        const match = await tx.tournamentMatch.findUnique({
          where: { id: sched.matchId },
        });
        if (!match) continue;

        const existingBooking = await tx.booking.findUnique({
          where: { tournamentMatchId: match.id },
        });

        const avulsoConflict = await tx.booking.findFirst({
          where: {
            spaceId: sched.spaceId,
            ...(existingBooking ? { id: { not: existingBooking.id } } : {}),
            status: { in: ['pending', 'confirmed'] },
            bookingType: { in: ['player_match', 'player_free_play'] },
            tournamentMatchId: null,
            startsAt: { lt: sched.endTime },
            endsAt: { gt: sched.startTime },
          },
          select: { id: true },
        });

        if (avulsoConflict) {
          if (conflictMode === 'block_avulso') {
            throw new ConflictException({
              type: 'tournament_vs_avulso',
              message: 'Tournament scheduling blocked by existing booking. Cancel avulso first.',
              avulsoBookingId: avulsoConflict.id,
              tournamentMatchId: match.id,
            });
          } else if (conflictMode === 'auto_cancel_avulso') {
            await tx.booking.update({
              where: { id: avulsoConflict.id },
              data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: `auto_cancelled:tournament:${tournamentId}`,
              },
            });
            bookingsAutoCancelled.push(avulsoConflict.id);
          } else {
            conflictsToResolve.push({
              tournamentMatchId: match.id,
              avulsoBookingId: avulsoConflict.id,
              proposedSlot: {
                date: sched.startTime.toISOString().slice(0, 10),
                startTime: sched.startTime,
                endTime: sched.endTime,
                spaceId: sched.spaceId,
              },
            });
            continue;
          }
        }

        const otherPlayers = match.player2Id ? [{ userId: match.player2Id, name: 'Player 2' }] : [];

        if (existingBooking) {
          await tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              startsAt: sched.startTime,
              endsAt: sched.endTime,
              spaceId: sched.spaceId,
            },
          });
          bookingsUpdated.push(existingBooking.id);
        } else {
          const created = await tx.booking.create({
            data: {
              klubId,
              spaceId: sched.spaceId,
              startsAt: sched.startTime,
              endsAt: sched.endTime,
              bookingType: 'tournament_match',
              creationMode: 'staff_assisted',
              status: 'confirmed',
              tournamentMatchId: match.id,
              primaryPlayerId: match.player1Id,
              otherPlayers,
              matchType: 'singles',
              extensions: [],
              createdById: tournamentCreatedById,
              approvedById: tournamentCreatedById,
              approvedAt: new Date(),
            },
          });
          bookingsCreated.push(created.id);
        }
      }

      return { bookingsCreated, bookingsUpdated, bookingsAutoCancelled, conflictsToResolve };
    });

    return {
      scheduled,
      unscheduled: [...skipped, ...unscheduled],
      bookingsCreated: sideEffects.bookingsCreated,
      bookingsUpdated: sideEffects.bookingsUpdated,
      bookingsAutoCancelled: sideEffects.bookingsAutoCancelled,
      conflictsToResolve: sideEffects.conflictsToResolve,
    };
  }

  private checkKlubHoursWarning(slot: Slot, hours: KlubHours): string | undefined {
    const slotHour = slot.startTime.getUTCHours();
    if (slotHour < hours.openingHour || slotHour >= hours.closingHour) {
      return `Scheduled at ${slotHour}h UTC, outside Klub hours (${hours.openingHour}-${hours.closingHour})`;
    }
    return undefined;
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
