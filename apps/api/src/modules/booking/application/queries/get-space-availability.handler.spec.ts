import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetSpaceAvailabilityHandler } from './get-space-availability.handler';
import { HourBandResolverService } from '../../domain/services/hour-band-resolver.service';

describe('GetSpaceAvailabilityHandler', () => {
  let handler: GetSpaceAvailabilityHandler;

  const makeSpace = (overrides: Partial<{ granularity: number; duration: number }> = {}) => ({
    id: 'space-1',
    name: 'Quadra 1',
    klubId: 'klub-1',
    slotGranularityMinutes: overrides.granularity ?? 60,
    slotDefaultDurationMinutes: overrides.duration ?? 60,
    hourBands: [],
    allowedMatchTypes: ['singles', 'doubles'],
  });

  const makeKlub = (openDays = '1,2,3,4,5,6,7') => ({
    config: { openingHour: 8, closingHour: 12, openDays },
  });

  beforeEach(() => {
    handler = new GetSpaceAvailabilityHandler({} as never, new HourBandResolverService());
  });

  it('gera 4 slots de 1h num dia 8-12h', async () => {
    const prisma = {
      space: { findUnique: vi.fn().mockResolvedValue(makeSpace()) },
      klub: { findUnique: vi.fn().mockResolvedValue(makeKlub()) },
      booking: { findMany: vi.fn().mockResolvedValue([]) },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute('space-1', '2030-01-01');
    expect(result.slots.length).toBe(4);
    expect(result.slots[0]?.startTime).toBe('2030-01-01T08:00:00.000Z');
    expect(result.slots[0]?.status).toBe('available');
    expect(result.slots[3]?.endTime).toBe('2030-01-01T12:00:00.000Z');
  });

  it('marca slots conflitantes com booking como booked', async () => {
    const prisma = {
      space: { findUnique: vi.fn().mockResolvedValue(makeSpace()) },
      klub: { findUnique: vi.fn().mockResolvedValue(makeKlub()) },
      booking: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'b1',
            startsAt: new Date('2030-01-01T09:00:00Z'),
            endsAt: new Date('2030-01-01T10:00:00Z'),
            bookingType: 'player_match',
          },
        ]),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute('space-1', '2030-01-01');
    const bookedSlot = result.slots.find((s) => s.startTime === '2030-01-01T09:00:00.000Z');
    expect(bookedSlot?.status).toBe('booked');
    expect(bookedSlot?.bookingId).toBe('b1');
  });

  it('retorna lista vazia se Klub fechado nesse dia da semana', async () => {
    const prisma = {
      space: { findUnique: vi.fn().mockResolvedValue(makeSpace()) },
      klub: { findUnique: vi.fn().mockResolvedValue(makeKlub('1,2,3,4,5')) },
      booking: { findMany: vi.fn().mockResolvedValue([]) },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    // 2030-01-06 is a Sunday (not in '1,2,3,4,5')
    const result = await handler.execute('space-1', '2030-01-06');
    expect(result.slots).toEqual([]);
  });
});
