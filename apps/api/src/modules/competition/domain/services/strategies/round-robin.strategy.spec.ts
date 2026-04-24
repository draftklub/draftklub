import { describe, it, expect, beforeEach } from 'vitest';
import { RoundRobinStrategy } from './round-robin.strategy';
import type { CategoryWithPlayers, DrawContext } from './tournament-format.strategy';

function makePlayers(n: number, prefix = 'p'): CategoryWithPlayers['players'] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `${prefix}-${i + 1}`,
    rating: 1500 - i * 50,
    seed: i + 1,
  }));
}

function makeContext(playersPerCategory: number): DrawContext {
  return {
    tournamentId: 'tour-1',
    format: 'round_robin',
    hasPrequalifiers: false,
    categories: [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(playersPerCategory) },
    ],
  };
}

describe('RoundRobinStrategy', () => {
  let strategy: RoundRobinStrategy;

  beforeEach(() => {
    strategy = new RoundRobinStrategy();
  });

  it('4 jogadores gera 6 partidas (4*3/2)', () => {
    const matches = strategy.generateMatches(makeContext(4));
    expect(matches.length).toBe(6);
  });

  it('5 jogadores gera 10 partidas (bye rotativo)', () => {
    const matches = strategy.generateMatches(makeContext(5));
    expect(matches.length).toBe(10);
  });

  it('6 jogadores gera 15 partidas', () => {
    const matches = strategy.generateMatches(makeContext(6));
    expect(matches.length).toBe(15);
  });

  it('cada par de jogadores aparece exatamente uma vez (4 jogadores)', () => {
    const matches = strategy.generateMatches(makeContext(4));
    const pairs = matches.map((m) => {
      const a = m.player1Id ?? '';
      const b = m.player2Id ?? '';
      return [a, b].sort().join('|');
    });
    expect(new Set(pairs).size).toBe(6);
  });

  it('cada jogador joga N-1 partidas (6 jogadores → 5 cada)', () => {
    const matches = strategy.generateMatches(makeContext(6));
    const counts = new Map<string, number>();
    for (const m of matches) {
      const p1 = m.player1Id ?? '';
      const p2 = m.player2Id ?? '';
      counts.set(p1, (counts.get(p1) ?? 0) + 1);
      counts.set(p2, (counts.get(p2) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBe(5);
    }
    expect(counts.size).toBe(6);
  });

  it('cada jogador joga no máximo uma vez por rodada', () => {
    const matches = strategy.generateMatches(makeContext(6));
    const playersByRound = new Map<number, Set<string>>();
    for (const m of matches) {
      const set = playersByRound.get(m.round) ?? new Set();
      const p1 = m.player1Id ?? '';
      const p2 = m.player2Id ?? '';
      expect(set.has(p1)).toBe(false);
      expect(set.has(p2)).toBe(false);
      set.add(p1);
      set.add(p2);
      playersByRound.set(m.round, set);
    }
  });

  it('validate rejeita categoria com menos de 3 jogadores', () => {
    const ctx: DrawContext = {
      tournamentId: 't',
      format: 'round_robin',
      hasPrequalifiers: false,
      categories: [
        { id: 'cat-x', name: 'X', order: 0, players: makePlayers(2) },
      ],
    };
    const result = strategy.validate(ctx);
    expect(result.ok).toBe(false);
    const firstError = result.errors?.[0] ?? '';
    expect(firstError).toMatch(/at least 3 players/i);
  });

  it('getInitialStatus respeita hasPrequalifiers', () => {
    expect(strategy.getInitialStatus(true)).toBe('prequalifying');
    expect(strategy.getInitialStatus(false)).toBe('in_progress');
  });
});
