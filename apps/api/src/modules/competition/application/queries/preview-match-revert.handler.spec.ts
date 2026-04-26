import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PreviewMatchRevertHandler } from './preview-match-revert.handler';

const MATCH_ID = '00000000-0000-0000-0040-000000000001';
const NEXT_ID = '00000000-0000-0000-0040-000000000002';
const NEXT_NEXT_ID = '00000000-0000-0000-0040-000000000003';
const PLAYER1_ID = '00000000-0000-0000-0001-000000000111';
const PLAYER2_ID = '00000000-0000-0000-0001-000000000222';
const RESULT_ID = '00000000-0000-0000-0050-000000000001';

interface FakeMatch {
  id: string;
  status: string;
  winnerId: string | null;
  matchResultId: string | null;
  bracketPosition: string;
  phase: string;
  matchKind: string;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
}

function buildPrisma(opts: {
  match?: FakeMatch | null;
  nextMatch?: FakeMatch | null;
  nextNextMatch?: { status: string } | null;
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
} = {}) {
  const tournamentMatchFindUnique = vi
    .fn()
    .mockResolvedValueOnce(opts.match ?? null);
  if (opts.nextMatch !== undefined) {
    tournamentMatchFindUnique.mockResolvedValueOnce(opts.nextMatch);
  }
  if (opts.nextNextMatch !== undefined) {
    tournamentMatchFindUnique.mockResolvedValueOnce(opts.nextNextMatch);
  }

  return {
    tournamentMatch: { findUnique: tournamentMatchFindUnique },
    matchResult: {
      findUnique: vi.fn().mockResolvedValue(opts.matchResult ?? null),
    },
  };
}

const completedMatch: FakeMatch = {
  id: MATCH_ID,
  status: 'completed',
  winnerId: PLAYER1_ID,
  matchResultId: RESULT_ID,
  bracketPosition: 'QF-1',
  phase: 'main',
  matchKind: 'main',
  nextMatchId: NEXT_ID,
  nextMatchSlot: 'top',
};

describe('PreviewMatchRevertHandler', () => {
  let handler: PreviewMatchRevertHandler;

  beforeEach(() => {
    handler = new PreviewMatchRevertHandler({} as never);
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('match completed retorna preview com affectedMatches + ratingDeltas', async () => {
    attach(
      buildPrisma({
        match: completedMatch,
        nextMatch: {
          id: NEXT_ID,
          status: 'pending',
          winnerId: null,
          matchResultId: null,
          bracketPosition: 'SF-1',
          phase: 'main',
          matchKind: 'main',
          nextMatchId: null,
          nextMatchSlot: null,
        },
        matchResult: {
          id: RESULT_ID,
          status: 'confirmed',
          player1Id: PLAYER1_ID,
          player2Id: PLAYER2_ID,
          player1RatingBefore: 1000,
          player1RatingAfter: 1020,
          player2RatingBefore: 1000,
          player2RatingAfter: 980,
        },
      }),
    );

    const r = await handler.execute(MATCH_ID);
    expect(r.cascade.affectedMatches).toHaveLength(2);
    expect(r.cascade.affectedMatches[0]?.id).toBe(MATCH_ID);
    expect(r.cascade.ratingDeltas).toHaveLength(2);
    expect(r.cascade.ratingDeltas[0]).toMatchObject({
      userId: PLAYER1_ID,
      delta: 20,
      toRevert: -20,
    });
    expect(r.cascade.ratingDeltas[1]).toMatchObject({
      userId: PLAYER2_ID,
      delta: -20,
      toRevert: 20,
    });
  });

  it('match scheduled rejeita 400 (nada para reverter)', async () => {
    attach(
      buildPrisma({
        match: { ...completedMatch, status: 'scheduled', winnerId: null },
      }),
    );
    await expect(handler.execute(MATCH_ID)).rejects.toThrow(/Only completed matches/);
  });

  it('cascade depth > 1 nivel emite warning', async () => {
    attach(
      buildPrisma({
        match: { ...completedMatch, nextMatchId: NEXT_ID },
        nextMatch: {
          id: NEXT_ID,
          status: 'completed',
          winnerId: PLAYER1_ID,
          matchResultId: 'res-2',
          bracketPosition: 'SF-1',
          phase: 'main',
          matchKind: 'main',
          nextMatchId: NEXT_NEXT_ID,
          nextMatchSlot: 'top',
        },
        nextNextMatch: { status: 'completed' },
      }),
    );

    const r = await handler.execute(MATCH_ID);
    expect(r.cascade.warnings).toContain('cascade_depth_exceeded_1_level');
  });

  it('match prequalifier emite dual_path_warning', async () => {
    attach(
      buildPrisma({
        match: { ...completedMatch, matchKind: 'prequalifier' },
        nextMatch: null,
      }),
    );
    const r = await handler.execute(MATCH_ID);
    expect(r.cascade.warnings).toContain('prequalifier_dual_path_warning');
  });
});
