import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RevertMatchHandler } from './revert-match.handler';
import { PreviewMatchRevertHandler } from '../queries/preview-match-revert.handler';

const MATCH_ID = '00000000-0000-0000-0040-000000000001';
const NEXT_ID = '00000000-0000-0000-0040-000000000002';
const RESULT_ID = '00000000-0000-0000-0050-000000000001';
const PLAYER1_ID = '00000000-0000-0000-0001-000000000111';
const PLAYER2_ID = '00000000-0000-0000-0001-000000000222';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';
const TOURNAMENT_ID = '00000000-0000-0000-0004-000000000001';
const RANKING_ID = '00000000-0000-0000-0007-000000000001';

interface FakeMatch {
  id: string;
  tournamentId: string;
  status: string;
  winnerId: string | null;
  matchResultId: string | null;
  completedAt: Date | null;
  bracketPosition: string;
  phase: string;
  matchKind: string;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
}

function makeMatch(overrides: Partial<FakeMatch> = {}): FakeMatch {
  return {
    id: MATCH_ID,
    tournamentId: TOURNAMENT_ID,
    status: 'completed',
    winnerId: PLAYER1_ID,
    matchResultId: RESULT_ID,
    completedAt: new Date('2026-04-25T20:00:00Z'),
    bracketPosition: 'QF-1',
    phase: 'main',
    matchKind: 'main',
    nextMatchId: null,
    nextMatchSlot: null,
    ...overrides,
  };
}

interface BuildOpts {
  match: FakeMatch;
  nextMatch?: FakeMatch | null;
  matchResult?: {
    id: string;
    status: string;
    player1Id: string;
    player2Id: string;
    player1RatingBefore: number | null;
    player1RatingAfter: number | null;
    player2RatingBefore: number | null;
    player2RatingAfter: number | null;
  } | null;
}

interface FakeTx {
  tournamentMatch: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  tournamentMatchRevert: { create: ReturnType<typeof vi.fn> };
  matchResult: { update: ReturnType<typeof vi.fn> };
  playerRankingEntry: { updateMany: ReturnType<typeof vi.fn> };
  tournament: { findUnique: ReturnType<typeof vi.fn> };
}

function buildPrisma(opts: BuildOpts) {
  // Preview path uses prisma.* directly
  const previewMatchFindUnique = vi.fn();
  previewMatchFindUnique.mockResolvedValueOnce(opts.match);
  if (opts.nextMatch !== undefined) {
    previewMatchFindUnique.mockResolvedValueOnce(opts.nextMatch);
  }

  // Revert tx path
  const txMatchFindUnique = vi.fn();
  txMatchFindUnique.mockResolvedValueOnce(opts.match);
  if (opts.nextMatch !== undefined) {
    txMatchFindUnique.mockResolvedValueOnce(opts.nextMatch);
  }
  const txMatchUpdate = vi.fn().mockResolvedValue({});
  const txRevertCreate = vi
    .fn()
    .mockImplementation(({ data }: { data: unknown }) =>
      Promise.resolve({ id: 'rev-1', ...(data as object) }),
    );
  const txMatchResultUpdate = vi.fn().mockResolvedValue({});
  const txPlayerRankingUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const txTournamentFindUnique = vi.fn().mockResolvedValue({ rankingId: RANKING_ID });

  const tx: FakeTx = {
    tournamentMatch: { findUnique: txMatchFindUnique, update: txMatchUpdate },
    tournamentMatchRevert: { create: txRevertCreate },
    matchResult: { update: txMatchResultUpdate },
    playerRankingEntry: { updateMany: txPlayerRankingUpdateMany },
    tournament: { findUnique: txTournamentFindUnique },
  };

  return {
    prisma: {
      tournamentMatch: { findUnique: previewMatchFindUnique },
      matchResult: {
        findUnique: vi.fn().mockResolvedValue(opts.matchResult ?? null),
      },
      $transaction: vi.fn(async (fn: (tx: FakeTx) => Promise<unknown>) => fn(tx)),
    },
    tx,
    spies: {
      txMatchUpdate,
      txRevertCreate,
      txMatchResultUpdate,
      txPlayerRankingUpdateMany,
    },
  };
}

const ratingResult = {
  id: RESULT_ID,
  status: 'confirmed',
  player1Id: PLAYER1_ID,
  player2Id: PLAYER2_ID,
  player1RatingBefore: 1000,
  player1RatingAfter: 1020,
  player2RatingBefore: 1000,
  player2RatingAfter: 980,
};

describe('RevertMatchHandler', () => {
  let handler: RevertMatchHandler;
  let preview: PreviewMatchRevertHandler;

  beforeEach(() => {
    preview = new PreviewMatchRevertHandler({} as never);
    handler = new RevertMatchHandler({} as never, preview);
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
    (preview as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('reverte match isolado (sem next): rating volta, status=scheduled, MatchResult=reverted', async () => {
    const mock = buildPrisma({
      match: makeMatch(),
      nextMatch: null,
      matchResult: ratingResult,
    });
    attach(mock.prisma);

    await handler.execute({ matchId: MATCH_ID, revertedById: STAFF_ID });

    expect(mock.spies.txRevertCreate).toHaveBeenCalledOnce();
    const matchUpdateCall = mock.spies.txMatchUpdate.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { status: string; winnerId: null; matchResultId: null; completedAt: null };
    };
    expect(matchUpdateCall.where.id).toBe(MATCH_ID);
    expect(matchUpdateCall.data.status).toBe('scheduled');
    expect(matchUpdateCall.data.winnerId).toBeNull();
    expect(matchUpdateCall.data.matchResultId).toBeNull();

    const resultUpdateCall = mock.spies.txMatchResultUpdate.mock.calls[0]?.[0] as {
      data: { status: string };
    };
    expect(resultUpdateCall.data.status).toBe('reverted');

    expect(mock.spies.txPlayerRankingUpdateMany).toHaveBeenCalledTimes(2);
    const firstDelta = mock.spies.txPlayerRankingUpdateMany.mock.calls[0]?.[0] as {
      data: { rating: { increment: number } };
    };
    expect(firstDelta.data.rating.increment).toBe(-20); // toRevert do player 1 (+20 -> -20)
  });

  it('cascade pending: limpa slot do nextMatch sem mudar status', async () => {
    const next = makeMatch({
      id: NEXT_ID,
      status: 'pending',
      winnerId: null,
      matchResultId: null,
      bracketPosition: 'SF-1',
      nextMatchId: null,
      nextMatchSlot: null,
    });
    const mock = buildPrisma({
      match: makeMatch({ nextMatchId: NEXT_ID, nextMatchSlot: 'top' }),
      nextMatch: next,
      matchResult: ratingResult,
    });
    attach(mock.prisma);

    await handler.execute({ matchId: MATCH_ID, revertedById: STAFF_ID });

    // 2 updates: o match em si + o nextMatch
    expect(mock.spies.txMatchUpdate).toHaveBeenCalledTimes(2);
    const nextUpdateCall = mock.spies.txMatchUpdate.mock.calls[1]?.[0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(nextUpdateCall.where.id).toBe(NEXT_ID);
    expect(nextUpdateCall.data.player1Id).toBeNull();
    expect(nextUpdateCall.data.status).toBeUndefined();
  });

  it('cascade completed: nextMatch tambem volta a scheduled (1 nivel)', async () => {
    const next = makeMatch({
      id: NEXT_ID,
      status: 'completed',
      winnerId: PLAYER1_ID,
      matchResultId: 'res-2',
      bracketPosition: 'SF-1',
      nextMatchId: null,
      nextMatchSlot: null,
    });
    const mock = buildPrisma({
      match: makeMatch({ nextMatchId: NEXT_ID, nextMatchSlot: 'bottom' }),
      nextMatch: next,
      matchResult: ratingResult,
    });
    attach(mock.prisma);

    await handler.execute({ matchId: MATCH_ID, revertedById: STAFF_ID });

    const nextUpdateCall = mock.spies.txMatchUpdate.mock.calls[1]?.[0] as {
      where: { id: string };
      data: { player2Id: null; status: string; winnerId: null };
    };
    expect(nextUpdateCall.where.id).toBe(NEXT_ID);
    expect(nextUpdateCall.data.player2Id).toBeNull();
    expect(nextUpdateCall.data.status).toBe('scheduled');
    expect(nextUpdateCall.data.winnerId).toBeNull();
  });

  it('audit log gravado com previousState completo', async () => {
    const mock = buildPrisma({
      match: makeMatch(),
      nextMatch: null,
      matchResult: ratingResult,
    });
    attach(mock.prisma);

    await handler.execute({
      matchId: MATCH_ID,
      revertedById: STAFF_ID,
      reason: 'wrong score reported',
    });

    const revertCreateCall = mock.spies.txRevertCreate.mock.calls[0]?.[0] as {
      data: {
        tournamentMatchId: string;
        revertedById: string;
        reason: string;
        previousState: Record<string, unknown>;
      };
    };
    expect(revertCreateCall.data.tournamentMatchId).toBe(MATCH_ID);
    expect(revertCreateCall.data.revertedById).toBe(STAFF_ID);
    expect(revertCreateCall.data.reason).toBe('wrong score reported');
    expect(revertCreateCall.data.previousState).toMatchObject({
      winnerId: PLAYER1_ID,
      matchResultId: RESULT_ID,
      status: 'completed',
    });
    const ratingDeltas = (revertCreateCall.data.previousState as { ratingDeltas: unknown[] })
      .ratingDeltas;
    expect(ratingDeltas).toHaveLength(2);
  });

  it('rating delta inverso eh aplicado ao PlayerRankingEntry', async () => {
    const mock = buildPrisma({
      match: makeMatch(),
      nextMatch: null,
      matchResult: ratingResult,
    });
    attach(mock.prisma);

    await handler.execute({ matchId: MATCH_ID, revertedById: STAFF_ID });

    const calls = mock.spies.txPlayerRankingUpdateMany.mock.calls.map(
      (c) =>
        c[0] as {
          where: { rankingId: string; userId: string };
          data: { rating: { increment: number } };
        },
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]?.data.rating.increment).toBe(-20); // p1 ganhou 20, reverte -20
    expect(calls[1]?.data.rating.increment).toBe(20); // p2 perdeu 20, reverte +20
  });

  it('match scheduled (race condition pos-preview) rejeita 400', async () => {
    const mock = buildPrisma({
      match: makeMatch(),
      nextMatch: null,
      matchResult: ratingResult,
    });
    // override: tx vê o match já como scheduled (race)
    mock.tx.tournamentMatch.findUnique = vi
      .fn()
      .mockResolvedValueOnce(makeMatch({ status: 'scheduled', winnerId: null }));
    attach(mock.prisma);

    await expect(handler.execute({ matchId: MATCH_ID, revertedById: STAFF_ID })).rejects.toThrow(
      /state changed since preview/,
    );
  });
});
