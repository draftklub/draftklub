import { describe, it, expect, vi } from 'vitest';
import { GetRankingHandler, sortEntries } from './get-ranking.handler';
import { decodeCursor, encodeCursor } from '../../../../shared/pagination/cursor';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

const makeEntry = (
  userId: string,
  rating: number,
  tournamentPoints: number,
): Parameters<typeof sortEntries>[0][0] => ({
  userId,
  rating,
  tournamentPoints,
  ratingSource: 'calculated',
  wins: 0,
  losses: 0,
  gamesPlayed: 0,
  lastRatingChange: 0,
  lastPlayedAt: null,
  user: { id: userId, fullName: userId, avatarUrl: null },
});

describe('sortEntries', () => {
  it('orderBy=rating ordena por rating desc', () => {
    const entries = [
      makeEntry('a', 1200, 100),
      makeEntry('b', 1500, 50),
      makeEntry('c', 1300, 200),
    ];
    const sorted = sortEntries(entries, 'rating', null);
    expect(sorted.map((e) => e.userId)).toEqual(['b', 'c', 'a']);
  });

  it('orderBy=tournament_points ordena por pontos desc, tiebreak por rating', () => {
    const entries = [
      makeEntry('a', 1500, 100),
      makeEntry('b', 1200, 100),
      makeEntry('c', 1300, 200),
    ];
    const sorted = sortEntries(entries, 'tournament_points', null);
    expect(sorted.map((e) => e.userId)).toEqual(['c', 'a', 'b']);
  });

  it('orderBy=combined com pesos 50/50', () => {
    const entries = [
      makeEntry('a', 1500, 0),
      makeEntry('b', 1000, 1000),
      makeEntry('c', 1200, 500),
    ];
    const sorted = sortEntries(entries, 'combined', { ratingWeight: 0.5, pointsWeight: 0.5 });
    expect(sorted.map((e) => e.userId)).toEqual(['b', 'c', 'a']);
  });

  it('orderBy=combined sem combinedWeight usa default 50/50', () => {
    const entries = [makeEntry('a', 2000, 0), makeEntry('b', 0, 2000)];
    const sorted = sortEntries(entries, 'combined', null);
    expect(sorted.length).toBe(2);
  });
});

/**
 * Sprint N batch N-16 — testes pinning o keyset DB-side. Mock simula
 * o que o Prisma faz: aplica `where` (incluindo OR keyset), aplica
 * `orderBy`, e fatia `take`.
 */
describe('GetRankingHandler — keyset pagination', () => {
  function fakeRanking(orderBy: string) {
    return {
      id: 'r1',
      name: 'Ranking',
      type: 'singles',
      gender: null,
      ageMin: null,
      ageMax: null,
      ratingEngine: 'elo',
      initialRating: 1200,
      active: true,
      orderBy,
      windowType: 'lifetime',
      windowSize: null,
      includesCasualMatches: true,
      includesTournamentMatches: true,
      includesTournamentPoints: false,
      combinedWeight: null,
    };
  }

  function makeAllEntries(num: number) {
    return Array.from({ length: num }, (_, i) => ({
      userId: `u-${String(i).padStart(3, '0')}`,
      rating: 2000 - i,
      tournamentPoints: 0,
      ratingSource: 'calculated',
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      lastRatingChange: 0,
      lastPlayedAt: null,
      active: true,
      user: { id: `u-${String(i).padStart(3, '0')}`, fullName: `User ${i}`, avatarUrl: null },
    }));
  }

  function makeHandler(numEntries: number, orderBy = 'rating') {
    const allEntries = makeAllEntries(numEntries);
    const prisma = {
      klubSportRanking: {
        findUnique: vi.fn().mockResolvedValue(fakeRanking(orderBy)),
      },
      playerRankingEntry: {
        count: vi.fn().mockResolvedValue(numEntries),
        findMany: vi.fn().mockImplementation((args: unknown) => {
          const { where, take } = args as {
            where?: {
              OR?: {
                rating?: number | { lt?: number };
                userId?: string | { gt?: string };
              }[];
            };
            take?: number;
          };
          let filtered = allEntries;
          const orClauses = where?.OR;
          if (orClauses) {
            const ltClause = orClauses[0]?.rating;
            const cursorRating =
              typeof ltClause === 'object' && ltClause && 'lt' in ltClause
                ? ltClause.lt
                : undefined;
            const tieRating =
              typeof orClauses[1]?.rating === 'number' ? orClauses[1].rating : undefined;
            const gtClause = orClauses[1]?.userId;
            const tieUserId =
              typeof gtClause === 'object' && gtClause && 'gt' in gtClause
                ? gtClause.gt
                : undefined;
            filtered = allEntries.filter((e) => {
              if (cursorRating !== undefined && e.rating < cursorRating) return true;
              if (
                tieRating !== undefined &&
                tieUserId !== undefined &&
                e.rating === tieRating &&
                e.userId > tieUserId
              )
                return true;
              return false;
            });
          }
          return Promise.resolve(filtered.slice(0, take));
        }),
      },
    };
    return new GetRankingHandler(prisma as unknown as PrismaService);
  }

  it('primeira página retorna até `limit` items + nextCursor quando há mais', async () => {
    const handler = makeHandler(150);
    const result = await handler.execute('r1', { limit: 100 });
    expect(result.players).toHaveLength(100);
    expect(result.players[0]?.position).toBe(1);
    expect(result.players[99]?.position).toBe(100);
    expect(result.nextCursor).not.toBeNull();
    expect(result.totalCount).toBe(150);
    const decoded = decodeCursor<{ userId: string; position: number }>(result.nextCursor ?? '');
    expect(decoded?.userId).toBe('u-099');
    expect(decoded?.position).toBe(100);
  });

  it('segunda página continua a partir do cursor com positions absolutas', async () => {
    const handler = makeHandler(150);
    const cursor = encodeCursor({
      userId: 'u-099',
      rating: 2000 - 99,
      tournamentPoints: 0,
      position: 100,
    });
    const result = await handler.execute('r1', { limit: 100, cursor });
    expect(result.players).toHaveLength(50);
    expect(result.players[0]?.position).toBe(101);
    expect(result.players[0]?.userId).toBe('u-100');
    expect(result.players[49]?.position).toBe(150);
    expect(result.nextCursor).toBeNull();
  });

  it('limit maior que totalCount → retorna tudo + nextCursor null', async () => {
    const handler = makeHandler(20);
    const result = await handler.execute('r1', { limit: 100 });
    expect(result.players).toHaveLength(20);
    expect(result.nextCursor).toBeNull();
    expect(result.totalCount).toBe(20);
  });
});
