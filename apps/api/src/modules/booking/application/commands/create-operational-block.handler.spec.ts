import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateOperationalBlockHandler } from './create-operational-block.handler';
import { SeriesGeneratorService } from '../../domain/services/series-generator.service';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SPACE_ID = '00000000-0000-0000-0001-000000000001';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

function makePrisma(overrides: {
  spaceKlubId?: string;
  existingOpenWeather?: { id: string } | null;
  conflicts?: { id: string }[];
  maxRecurrenceMonths?: number;
}) {
  const tx = {
    booking: {
      create: vi.fn().mockImplementation((args: { data: { id?: string } }) =>
        Promise.resolve({ id: 'new-b', ...(args.data as Record<string, unknown>) }),
      ),
      findMany: vi.fn().mockResolvedValue(overrides.conflicts ?? []),
      update: vi.fn().mockResolvedValue({}),
    },
    bookingSeries: {
      create: vi.fn().mockImplementation((args: { data: unknown }) =>
        Promise.resolve({ id: 'series-1', ...(args.data as Record<string, unknown>) }),
      ),
    },
  };

  return {
    prisma: {
      space: {
        findUnique: vi.fn().mockResolvedValue({
          id: SPACE_ID,
          klubId: overrides.spaceKlubId ?? KLUB_ID,
        }),
      },
      klub: {
        findUnique: vi.fn().mockResolvedValue({
          config: { maxRecurrenceMonths: overrides.maxRecurrenceMonths ?? 3 },
        }),
      },
      booking: {
        findFirst: vi.fn().mockResolvedValue(overrides.existingOpenWeather ?? null),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
    tx,
  };
}

describe('CreateOperationalBlockHandler', () => {
  let handler: CreateOperationalBlockHandler;

  beforeEach(() => {
    handler = new CreateOperationalBlockHandler({} as never, new SeriesGeneratorService());
  });

  it('maintenance cria bloqueio e auto-cancela 2 player bookings', async () => {
    const { prisma, tx } = makePrisma({
      conflicts: [{ id: 'pb1' }, { id: 'pb2' }],
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      klubId: KLUB_ID,
      spaceId: SPACE_ID,
      blockType: 'maintenance',
      startsAt: new Date('2030-01-15T10:00:00Z'),
      endsAt: new Date('2030-01-15T14:00:00Z'),
      createdById: STAFF_ID,
    });

    expect(result.autoCancelledBookings).toEqual(['pb1', 'pb2']);
    expect(tx.booking.update).toHaveBeenCalledTimes(2);
  });

  it('weather_closed permite endsAt=null (open-ended)', async () => {
    const { prisma } = makePrisma({});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      klubId: KLUB_ID,
      spaceId: SPACE_ID,
      blockType: 'weather_closed',
      startsAt: new Date('2030-01-15T10:00:00Z'),
      createdById: STAFF_ID,
    });
    expect(result.block).toBeTruthy();
    expect(result.series).toBeNull();
  });

  it('rejeita weather_closed recorrente', async () => {
    const { prisma } = makePrisma({});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        spaceId: SPACE_ID,
        blockType: 'weather_closed',
        startsAt: new Date('2030-01-15T10:00:00Z'),
        createdById: STAFF_ID,
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [2],
          endsOn: new Date('2030-02-15T10:00:00Z'),
          durationMinutes: 60,
        },
      }),
    ).rejects.toThrow(/weather_closed cannot be recurrent/);
  });

  it('rejeita endsAt=null para tipos nao-weather', async () => {
    const { prisma } = makePrisma({});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        spaceId: SPACE_ID,
        blockType: 'maintenance',
        startsAt: new Date('2030-01-15T10:00:00Z'),
        createdById: STAFF_ID,
      }),
    ).rejects.toThrow(/endsAt is required/);
  });

  it('rejeita segundo weather_closed open-ended se ja existe um aberto', async () => {
    const { prisma } = makePrisma({
      existingOpenWeather: { id: 'open-weather-1' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        spaceId: SPACE_ID,
        blockType: 'weather_closed',
        startsAt: new Date('2030-01-15T10:00:00Z'),
        createdById: STAFF_ID,
      }),
    ).rejects.toThrow(/open-ended weather_closed/);
  });
});
