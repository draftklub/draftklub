import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelTournamentHandler } from './cancel-tournament.handler';

const TOURNAMENT_ID = '00000000-0000-0000-0004-000000000001';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

interface FakeTournament {
  id: string;
  status: string;
  matches: { id: string }[];
}

interface FakeTx {
  tournament: { update: ReturnType<typeof vi.fn> };
  booking: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
}

function buildPrisma(opts: {
  tournament: FakeTournament;
  bookingsToCancel?: { id: string }[];
}) {
  const txTournamentUpdate = vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: unknown }) =>
    Promise.resolve({ id: where.id, ...(data as object) }),
  );
  const txBookingFindMany = vi.fn().mockResolvedValue(opts.bookingsToCancel ?? []);
  const txBookingUpdateMany = vi.fn().mockResolvedValue({ count: opts.bookingsToCancel?.length ?? 0 });

  const tx: FakeTx = {
    tournament: { update: txTournamentUpdate },
    booking: { findMany: txBookingFindMany, updateMany: txBookingUpdateMany },
  };

  return {
    prisma: {
      tournament: { findUnique: vi.fn().mockResolvedValue(opts.tournament) },
      $transaction: vi.fn(async (fn: (tx: FakeTx) => Promise<unknown>) => fn(tx)),
    },
    spies: { txTournamentUpdate, txBookingFindMany, txBookingUpdateMany },
  };
}

describe('CancelTournamentHandler', () => {
  let handler: CancelTournamentHandler;

  beforeEach(() => {
    handler = new CancelTournamentHandler({} as never);
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('cancela tournament em status draft -> status cancelled', async () => {
    const mock = buildPrisma({
      tournament: { id: TOURNAMENT_ID, status: 'draft', matches: [] },
    });
    attach(mock.prisma);
    const result = await handler.execute({ tournamentId: TOURNAMENT_ID, cancelledById: STAFF_ID });
    const updateCall = mock.spies.txTournamentUpdate.mock.calls[0]?.[0] as { data: { status: string; cancelledById: string } };
    expect(updateCall.data.status).toBe('cancelled');
    expect(updateCall.data.cancelledById).toBe(STAFF_ID);
    expect(result.cancelledBookings).toEqual([]);
  });

  it('cascade: bookings tournament_match pending/confirmed sao cancelados', async () => {
    const mock = buildPrisma({
      tournament: {
        id: TOURNAMENT_ID,
        status: 'in_progress',
        matches: [{ id: 'm1' }, { id: 'm2' }],
      },
      bookingsToCancel: [{ id: 'b1' }, { id: 'b2' }],
    });
    attach(mock.prisma);
    const result = await handler.execute({
      tournamentId: TOURNAMENT_ID,
      cancelledById: STAFF_ID,
      reason: 'rain forecast',
    });
    expect(result.cancelledBookings).toEqual(['b1', 'b2']);
    const updateManyCall = mock.spies.txBookingUpdateMany.mock.calls[0]?.[0] as { data: { status: string; cancellationReason: string } };
    expect(updateManyCall.data.status).toBe('cancelled');
    expect(updateManyCall.data.cancellationReason).toBe(`tournament_cancelled:${TOURNAMENT_ID}`);
  });

  it('bookings ja cancelados nao mudam (filtro pending|confirmed)', async () => {
    const mock = buildPrisma({
      tournament: {
        id: TOURNAMENT_ID,
        status: 'in_progress',
        matches: [{ id: 'm1' }],
      },
      bookingsToCancel: [],
    });
    attach(mock.prisma);
    const result = await handler.execute({ tournamentId: TOURNAMENT_ID, cancelledById: STAFF_ID });
    expect(result.cancelledBookings).toEqual([]);
    expect(mock.spies.txBookingUpdateMany).not.toHaveBeenCalled();
  });

  it('rejeita cancelamento de tournament finished -> 400', async () => {
    const mock = buildPrisma({
      tournament: { id: TOURNAMENT_ID, status: 'finished', matches: [] },
    });
    attach(mock.prisma);
    await expect(
      handler.execute({ tournamentId: TOURNAMENT_ID, cancelledById: STAFF_ID }),
    ).rejects.toThrow(/cannot be cancelled/);
  });

  it('reason explicito eh persistido em tournament.cancellationReason', async () => {
    const mock = buildPrisma({
      tournament: { id: TOURNAMENT_ID, status: 'draft', matches: [] },
    });
    attach(mock.prisma);
    await handler.execute({
      tournamentId: TOURNAMENT_ID,
      cancelledById: STAFF_ID,
      reason: 'sponsor desistiu',
    });
    const updateCall = mock.spies.txTournamentUpdate.mock.calls[0]?.[0] as { data: { cancellationReason: string } };
    expect(updateCall.data.cancellationReason).toBe('sponsor desistiu');
  });
});
