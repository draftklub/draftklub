import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelBookingSeriesHandler } from './cancel-booking-series.handler';

const SERIES_ID = '00000000-0000-0000-0005-000000000001';
const CREATOR_ID = '00000000-0000-0000-0001-000000000aaa';
const OTHER_ID = '00000000-0000-0000-0001-000000000bbb';

function makeTx(txOverrides: Record<string, unknown> = {}) {
  return {
    booking: {
      update: vi.fn().mockResolvedValue({}),
    },
    bookingSeries: {
      update: vi.fn().mockResolvedValue({}),
    },
    ...txOverrides,
  };
}

function makePrisma(overrides: {
  series: { createdById: string; status?: string } | null;
  booking?: { id: string; bookingSeriesId: string; startsAt: Date; status: string } | null;
  seriesBookings?: { id: string }[];
}) {
  const tx = makeTx();
  const prisma = {
    bookingSeries: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.series
          ? { id: SERIES_ID, status: 'active', ...overrides.series }
          : null,
      ),
    },
    booking: {
      findUnique: vi.fn().mockResolvedValue(overrides.booking ?? null),
      findMany: vi.fn().mockResolvedValue(overrides.seriesBookings ?? []),
      update: vi.fn().mockImplementation((args: { where: { id: string } }) =>
        Promise.resolve({ id: args.where.id, status: 'cancelled' }),
      ),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, tx };
}

describe('CancelBookingSeriesHandler', () => {
  let handler: CancelBookingSeriesHandler;

  beforeEach(() => {
    handler = new CancelBookingSeriesHandler({} as never);
  });

  it('this_only cancela apenas o booking especifico', async () => {
    const { prisma } = makePrisma({
      series: { createdById: CREATOR_ID },
      booking: {
        id: 'b1',
        bookingSeriesId: SERIES_ID,
        startsAt: new Date('2030-01-15T10:00:00Z'),
        status: 'confirmed',
      },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      seriesId: SERIES_ID,
      mode: 'this_only',
      bookingId: 'b1',
      cancelledById: CREATOR_ID,
      isStaff: false,
    });
    expect(result.cancelled).toEqual(['b1']);
    expect(result.seriesStatus).toBe('active');
  });

  it('this_and_future cancela pivot + posteriores, ajusta endsOn', async () => {
    const pivotDate = new Date('2030-02-01T10:00:00Z');
    const { prisma, tx } = makePrisma({
      series: { createdById: CREATOR_ID },
      booking: {
        id: 'b2',
        bookingSeriesId: SERIES_ID,
        startsAt: pivotDate,
        status: 'confirmed',
      },
      seriesBookings: [{ id: 'b2' }, { id: 'b3' }, { id: 'b4' }],
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      seriesId: SERIES_ID,
      mode: 'this_and_future',
      bookingId: 'b2',
      cancelledById: CREATOR_ID,
      isStaff: false,
    });
    expect(result.cancelled).toEqual(['b2', 'b3', 'b4']);
    expect((result as { newSeriesEndsOn?: string }).newSeriesEndsOn).toBe(
      pivotDate.toISOString(),
    );
    expect(tx.bookingSeries.update).toHaveBeenCalledWith({
      where: { id: SERIES_ID },
      data: { endsOn: pivotDate },
    });
  });

  it('all cancela todos + marca serie cancelled', async () => {
    const { prisma, tx } = makePrisma({
      series: { createdById: CREATOR_ID },
      seriesBookings: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }],
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      seriesId: SERIES_ID,
      mode: 'all',
      cancelledById: CREATOR_ID,
      isStaff: false,
    });
    expect(result.cancelled).toEqual(['b1', 'b2', 'b3']);
    expect(result.seriesStatus).toBe('cancelled');
    expect(tx.bookingSeries.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled' }) as object,
      }),
    );
  });

  it('rejeita cancelamento se nao-creator e nao-staff', async () => {
    const { prisma } = makePrisma({
      series: { createdById: CREATOR_ID },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        seriesId: SERIES_ID,
        mode: 'all',
        cancelledById: OTHER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/creator or staff/);
  });
});
