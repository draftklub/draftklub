import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBookingSeriesHandler } from './create-booking-series.handler';
import { SeriesGeneratorService } from '../../domain/services/series-generator.service';
import { HourBandResolverService } from '../../domain/services/hour-band-resolver.service';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SPACE_ID = '00000000-0000-0000-0001-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';

function futureTuesday(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((2 - d.getUTCDay() + 7) % 7 || 7));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function makePrisma(overrides: {
  bookingModes?: string[];
  maxRecurrenceMonths?: number;
  existingInWindow?: unknown[];
  otherOverlaps?: unknown[];
}) {
  const tx = {
    bookingSeries: {
      create: vi
        .fn()
        .mockImplementation((args: { data: unknown }) =>
          Promise.resolve({ id: 'series-1', ...(args.data as Record<string, unknown>) }),
        ),
    },
    booking: {
      create: vi
        .fn()
        .mockImplementation((args: { data: unknown }) =>
          Promise.resolve({ id: 'b-' + Math.random(), ...(args.data as Record<string, unknown>) }),
        ),
    },
  };

  return {
    prisma: {
      space: {
        findUnique: vi.fn().mockResolvedValue({
          id: SPACE_ID,
          klubId: KLUB_ID,
          bookingActive: true,
          status: 'active',
          slotGranularityMinutes: 30,
          slotDefaultDurationMinutes: 60,
          hourBands: [],
          allowedMatchTypes: ['singles', 'doubles'],
        }),
      },
      klub: {
        findUnique: vi.fn().mockResolvedValue({
          config: {
            maxRecurrenceMonths: overrides.maxRecurrenceMonths ?? 3,
            bookingModes: overrides.bookingModes ?? ['direct'],
            accessMode: 'public',
            openingHour: 6,
            closingHour: 23,
            openDays: '1,2,3,4,5,6,7',
          },
        }),
      },
      membership: { findFirst: vi.fn().mockResolvedValue({ id: 'm1' }) },
      booking: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce(overrides.existingInWindow ?? [])
          .mockResolvedValueOnce(overrides.otherOverlaps ?? []),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
    tx,
  };
}

describe('CreateBookingSeriesHandler (atomic)', () => {
  let handler: CreateBookingSeriesHandler;

  beforeEach(() => {
    handler = new CreateBookingSeriesHandler(
      {} as never,
      new SeriesGeneratorService(),
      new HourBandResolverService(),
    );
  });

  const baseCmd = () => {
    const tue = futureTuesday();
    const end = new Date(tue);
    end.setUTCDate(end.getUTCDate() + 22);
    end.setUTCHours(23, 59, 0, 0);
    return {
      klubId: KLUB_ID,
      spaceId: SPACE_ID,
      frequency: 'weekly' as const,
      interval: 1,
      daysOfWeek: [2],
      startsOn: tue,
      endsOn: end,
      startHour: 19,
      startMinute: 0,
      matchType: 'singles' as const,
      bookingType: 'player_match' as const,
      primaryPlayerId: USER_ID,
      otherPlayers: [],
      createdById: USER_ID,
      createdByIsStaff: false,
    };
  };

  it('cria 4 ocorrencias sem conflito', async () => {
    const { prisma, tx } = makePrisma({});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute(baseCmd());
    expect(result.bookings.length).toBe(4);
    expect(tx.booking.create).toHaveBeenCalledTimes(4);
    expect(tx.bookingSeries.create).toHaveBeenCalledTimes(1);
  });

  it('ATOMIC: se 1 ocorrencia conflita, serie INTEIRA eh rejeitada (409 com lista completa)', async () => {
    const cmd = baseCmd();
    // Conflict in the 2nd occurrence (a week after first)
    const secondTuesday = new Date(cmd.startsOn);
    secondTuesday.setUTCDate(secondTuesday.getUTCDate() + 7);
    secondTuesday.setUTCHours(19, 0, 0, 0);
    const conflictEnd = new Date(secondTuesday.getTime() + 60 * 60_000);

    const { prisma, tx } = makePrisma({
      existingInWindow: [
        {
          id: 'existing-1',
          spaceId: SPACE_ID,
          startsAt: secondTuesday,
          endsAt: conflictEnd,
          primaryPlayerId: null,
          otherPlayers: [],
        },
      ],
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(handler.execute(cmd)).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'series_conflicts',
      }) as object,
    });
    // Nothing was created
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(tx.bookingSeries.create).not.toHaveBeenCalled();
  });

  it('rejeita serie com range maior que maxRecurrenceMonths', async () => {
    const cmd = baseCmd();
    const end = new Date(cmd.startsOn);
    end.setUTCMonth(end.getUTCMonth() + 6); // 6 meses
    cmd.endsOn = end;

    const { prisma } = makePrisma({ maxRecurrenceMonths: 3 });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(handler.execute(cmd)).rejects.toThrow(/maxRecurrenceMonths/);
  });

  it('rejeita quando serie gera 0 ocorrencias', async () => {
    const cmd = baseCmd();
    cmd.daysOfWeek = [0]; // Sunday, but startsOn is Tuesday; endsOn 3 weeks later
    const end = new Date(cmd.startsOn);
    end.setUTCDate(end.getUTCDate() + 1); // only 1 day window
    cmd.endsOn = end;

    const { prisma } = makePrisma({});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(handler.execute(cmd)).rejects.toThrow(/0 occurrences/);
  });

  it('cria serie com status pending quando mode eh staff_approval', async () => {
    const { prisma, tx } = makePrisma({ bookingModes: ['staff_approval'] });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute(baseCmd());
    const firstBookingCall = (
      tx.booking.create.mock.calls[0] as [{ data: { status?: string } }]
    )[0];
    expect(firstBookingCall.data.status).toBe('pending');
  });
});
