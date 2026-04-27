import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { SeriesGeneratorService } from '../../domain/services/series-generator.service';

const MAX_OCCURRENCES = 100;

export interface OperationalBlockRecurrence {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  interval: number;
  daysOfWeek: number[];
  endsOn: Date;
  durationMinutes: number;
}

export interface CreateOperationalBlockCommand {
  klubId: string;
  spaceId: string;
  blockType: 'maintenance' | 'weather_closed' | 'staff_blocked';
  startsAt: Date;
  endsAt?: Date;
  reason?: string;
  notes?: string;
  createdById: string;
  recurrence?: OperationalBlockRecurrence;
}

@Injectable()
export class CreateOperationalBlockHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: SeriesGeneratorService,
  ) {}

  async execute(cmd: CreateOperationalBlockCommand) {
    // ─── Validações de tipo ────────────────────────────────────
    if (cmd.blockType === 'weather_closed') {
      if (cmd.recurrence) {
        throw new BadRequestException('weather_closed cannot be recurrent');
      }
      // endsAt is optional for weather_closed (open-ended)
    } else {
      if (!cmd.endsAt) {
        throw new BadRequestException(`endsAt is required for blockType '${cmd.blockType}'`);
      }
    }

    if (cmd.endsAt && cmd.endsAt <= cmd.startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const space = await this.prisma.space.findUnique({ where: { id: cmd.spaceId } });
    if (!space) throw new NotFoundException('Space not found');
    if (space.klubId !== cmd.klubId) {
      throw new BadRequestException('Space does not belong to this Klub');
    }

    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    // ─── Reject duplicate open-ended weather_closed ────────────
    if (cmd.blockType === 'weather_closed' && !cmd.endsAt) {
      const openWeather = await this.prisma.booking.findFirst({
        where: {
          spaceId: cmd.spaceId,
          bookingType: 'weather_closed',
          endsAt: null,
          status: { in: ['pending', 'confirmed'] },
        },
        select: { id: true },
      });
      if (openWeather) {
        throw new BadRequestException(
          `Space already has an open-ended weather_closed block (${openWeather.id}). Close it first.`,
        );
      }
    }

    if (!cmd.recurrence) {
      return this.createSingleBlock(cmd, config.maxRecurrenceMonths);
    }

    return this.createRecurrentBlocks(cmd, config.maxRecurrenceMonths);
  }

  private async createSingleBlock(cmd: CreateOperationalBlockCommand, _maxMonths: number) {
    return this.prisma.$transaction(async (tx) => {
      const block = await tx.booking.create({
        data: {
          klubId: cmd.klubId,
          spaceId: cmd.spaceId,
          startsAt: cmd.startsAt,
          endsAt: cmd.endsAt ?? null,
          bookingType: cmd.blockType,
          creationMode: 'staff_assisted',
          status: 'confirmed',
          primaryPlayerId: null,
          otherPlayers: [],
          notes: cmd.notes ?? cmd.reason ?? null,
          createdById: cmd.createdById,
          approvedById: cmd.createdById,
          approvedAt: new Date(),
        },
      });

      const autoCancelled = await this.autoCancelConflicts(
        tx,
        block.id,
        cmd.spaceId,
        cmd.blockType,
        cmd.startsAt,
        cmd.endsAt,
        cmd.createdById,
      );

      return { block, series: null, autoCancelledBookings: autoCancelled };
    });
  }

  private async createRecurrentBlocks(cmd: CreateOperationalBlockCommand, maxMonths: number) {
    const recurrence = cmd.recurrence;
    if (!recurrence) {
      throw new BadRequestException('recurrence config is missing');
    }
    if (!cmd.endsAt) {
      throw new BadRequestException('endsAt is required for recurrent blocks');
    }

    const rangeMs = recurrence.endsOn.getTime() - cmd.startsAt.getTime();
    const maxMs = maxMonths * 31 * 24 * 60 * 60_000;
    if (rangeMs > maxMs) {
      throw new BadRequestException(`Recurrence range exceeds maxRecurrenceMonths (${maxMonths})`);
    }

    const occurrences = this.generator.generate({
      startsOn: cmd.startsAt,
      endsOn: recurrence.endsOn,
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      daysOfWeek: recurrence.daysOfWeek,
      startHour: cmd.startsAt.getUTCHours(),
      startMinute: cmd.startsAt.getUTCMinutes(),
      durationMinutes: recurrence.durationMinutes,
    });

    if (occurrences.length === 0) {
      throw new BadRequestException('Recurrence generates 0 occurrences');
    }
    if (occurrences.length > MAX_OCCURRENCES) {
      throw new BadRequestException(
        `Recurrence would generate ${occurrences.length} occurrences (max ${MAX_OCCURRENCES})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const series = await tx.bookingSeries.create({
        data: {
          klubId: cmd.klubId,
          spaceId: cmd.spaceId,
          frequency: recurrence.frequency,
          interval: recurrence.interval,
          daysOfWeek: recurrence.daysOfWeek,
          startsOn: cmd.startsAt,
          endsOn: recurrence.endsOn,
          durationMinutes: recurrence.durationMinutes,
          startHour: cmd.startsAt.getUTCHours(),
          startMinute: cmd.startsAt.getUTCMinutes(),
          bookingType: cmd.blockType,
          primaryPlayerId: null,
          otherPlayers: [],
          notes: cmd.notes ?? cmd.reason ?? null,
          createdById: cmd.createdById,
        },
      });

      const blocks = [];
      const allAutoCancelled: string[] = [];

      for (const occ of occurrences) {
        const block = await tx.booking.create({
          data: {
            klubId: cmd.klubId,
            spaceId: cmd.spaceId,
            startsAt: occ.startsAt,
            endsAt: occ.endsAt,
            bookingType: cmd.blockType,
            creationMode: 'staff_assisted',
            status: 'confirmed',
            primaryPlayerId: null,
            otherPlayers: [],
            notes: cmd.notes ?? cmd.reason ?? null,
            createdById: cmd.createdById,
            approvedById: cmd.createdById,
            approvedAt: new Date(),
            bookingSeriesId: series.id,
          },
        });
        blocks.push(block);

        const ids = await this.autoCancelConflicts(
          tx,
          block.id,
          cmd.spaceId,
          cmd.blockType,
          occ.startsAt,
          occ.endsAt,
          cmd.createdById,
        );
        allAutoCancelled.push(...ids);
      }

      return { block: null, series, blocks, autoCancelledBookings: allAutoCancelled };
    });
  }

  private async autoCancelConflicts(
    tx: Prisma.TransactionClient,
    blockId: string,
    spaceId: string,
    blockType: string,
    startsAt: Date,
    endsAt: Date | null | undefined,
    cancelledById: string,
  ): Promise<string[]> {
    const effectiveEnd = endsAt ?? new Date('2099-12-31T23:59:59Z');

    const conflicts = await tx.booking.findMany({
      where: {
        spaceId,
        id: { not: blockId },
        bookingType: { in: ['player_match', 'player_free_play'] },
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: effectiveEnd },
        OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true },
    });

    const now = new Date();
    for (const c of conflicts) {
      await tx.booking.update({
        where: { id: c.id },
        data: {
          status: 'cancelled',
          cancelledById,
          cancelledAt: now,
          cancellationReason: `auto_cancelled:${blockType}:${blockId}`,
          autoCancelledByBookingId: blockId,
        },
      });
    }

    return conflicts.map((c) => c.id);
  }
}
