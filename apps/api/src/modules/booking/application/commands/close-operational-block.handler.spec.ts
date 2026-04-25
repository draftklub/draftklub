import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloseOperationalBlockHandler } from './close-operational-block.handler';

const BLOCK_ID = '00000000-0000-0000-0005-000000000002';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

describe('CloseOperationalBlockHandler', () => {
  let handler: CloseOperationalBlockHandler;

  beforeEach(() => {
    handler = new CloseOperationalBlockHandler({} as never);
  });

  it('fecha weather_closed com endsAt=now (ou especifico)', async () => {
    const block = {
      id: BLOCK_ID,
      bookingType: 'weather_closed',
      startsAt: new Date(Date.now() - 2 * 3_600_000),
      endsAt: null,
    };
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(block),
        update: vi.fn().mockImplementation((args: { data: { endsAt: Date } }) =>
          Promise.resolve({ ...block, endsAt: args.data.endsAt, status: 'completed' }),
        ),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({ bookingId: BLOCK_ID, closedById: STAFF_ID });
    expect(result.endsAt).toBeInstanceOf(Date);
    expect(result.status).toBe('completed');
  });

  it('rejeita fechar block que nao eh weather_closed', async () => {
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: BLOCK_ID,
          bookingType: 'maintenance',
          startsAt: new Date(),
          endsAt: new Date(),
        }),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ bookingId: BLOCK_ID, closedById: STAFF_ID }),
    ).rejects.toThrow(/weather_closed/);
  });

  it('rejeita fechar block que ja tem endsAt', async () => {
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: BLOCK_ID,
          bookingType: 'weather_closed',
          startsAt: new Date(Date.now() - 2 * 3_600_000),
          endsAt: new Date(Date.now() - 3_600_000),
        }),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ bookingId: BLOCK_ID, closedById: STAFF_ID }),
    ).rejects.toThrow(/already has endsAt/);
  });
});
