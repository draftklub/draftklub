import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSpaceHandler } from './delete-space.handler';

const KLUB_ID = '00000000-0000-0000-0001-000000000001';
const SPACE_ID = '00000000-0000-0000-0002-000000000001';

function makeRepo(space: { klubId: string; deletedAt: Date | null } | null) {
  return {
    findById: vi.fn().mockResolvedValue(space),
    create: vi.fn(),
    findManyByKlub: vi.fn(),
    update: vi.fn(),
  };
}

function makePrisma(futureBookingsCount: number) {
  return {
    booking: { count: vi.fn().mockResolvedValue(futureBookingsCount) },
    space: {
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: SPACE_ID, ...args.data }),
      ),
    },
  };
}

describe('DeleteSpaceHandler', () => {
  let handler: DeleteSpaceHandler;

  beforeEach(() => {
    handler = new DeleteSpaceHandler({} as never, {} as never);
  });

  it('soft delete OK quando não há bookings futuros', async () => {
    const repo = makeRepo({ klubId: KLUB_ID, deletedAt: null });
    const prisma = makePrisma(0);
    (handler as unknown as { prisma: unknown; spaceRepo: unknown }).prisma = prisma;
    (handler as unknown as { spaceRepo: unknown }).spaceRepo = repo;

    const result = await handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID });
    expect(prisma.space.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.space.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    expect(updateArg.data.bookingActive).toBe(false);
    expect(updateArg.data.status).toBe('inactive');
    expect(result).toBeDefined();
  });

  it('bloqueia quando há bookings futuros', async () => {
    const repo = makeRepo({ klubId: KLUB_ID, deletedAt: null });
    const prisma = makePrisma(3);
    (handler as unknown as { prisma: unknown; spaceRepo: unknown }).prisma = prisma;
    (handler as unknown as { spaceRepo: unknown }).spaceRepo = repo;

    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID }),
    ).rejects.toThrow(/3 future booking/);
    expect(prisma.space.update).not.toHaveBeenCalled();
  });

  it('bloqueia space de outro Klub (path manipulation)', async () => {
    const repo = makeRepo({ klubId: 'klub-outro', deletedAt: null });
    const prisma = makePrisma(0);
    (handler as unknown as { prisma: unknown; spaceRepo: unknown }).prisma = prisma;
    (handler as unknown as { spaceRepo: unknown }).spaceRepo = repo;

    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID }),
    ).rejects.toThrow(/não pertence/);
  });

  it('404 quando space não existe ou já deletado', async () => {
    const repo = makeRepo(null);
    (handler as unknown as { prisma: unknown; spaceRepo: unknown }).prisma = makePrisma(0);
    (handler as unknown as { spaceRepo: unknown }).spaceRepo = repo;

    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID }),
    ).rejects.toThrow(/não encontrado/);
  });
});
