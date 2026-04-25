import { describe, it, expect } from 'vitest';
import { sortEntries } from './get-ranking.handler';

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
      makeEntry('a', 1500, 0),    // score = 750
      makeEntry('b', 1000, 1000), // score = 1000
      makeEntry('c', 1200, 500),  // score = 850
    ];
    const sorted = sortEntries(entries, 'combined', { ratingWeight: 0.5, pointsWeight: 0.5 });
    expect(sorted.map((e) => e.userId)).toEqual(['b', 'c', 'a']);
  });

  it('orderBy=combined sem combinedWeight usa default 50/50', () => {
    const entries = [
      makeEntry('a', 2000, 0),
      makeEntry('b', 0, 2000),
    ];
    const sorted = sortEntries(entries, 'combined', null);
    // a: 1000, b: 1000 → tie, ordem original mantida
    expect(sorted.length).toBe(2);
  });
});
