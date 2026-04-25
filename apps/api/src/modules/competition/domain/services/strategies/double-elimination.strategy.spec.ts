import { describe, it, expect, beforeEach } from 'vitest';
import { BracketGeneratorService } from '../bracket-generator.service';
import { DoubleEliminationStrategy } from './double-elimination.strategy';
import type { DrawContext } from './tournament-format.strategy';

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `p-${i + 1}`,
    rating: 1500 - i * 25,
    seed: i + 1,
  }));
}

function makeContext(playersCount: number): DrawContext {
  return {
    tournamentId: 'tour-1',
    format: 'double_elimination',
    hasPrequalifiers: false,
    categories: [{ id: 'cat-a', name: 'A', order: 0, players: makePlayers(playersCount) }],
  };
}

describe('DoubleEliminationStrategy (simplified MVP)', () => {
  let strategy: DoubleEliminationStrategy;

  beforeEach(() => {
    strategy = new DoubleEliminationStrategy(new BracketGeneratorService());
  });

  it('rejeita categoria com menos de 4 jogadores', () => {
    const result = strategy.validate(makeContext(3));
    expect(result.ok).toBe(false);
  });

  it('gera 3 brackets distintos para 8 jogadores: WB (main), LB (losers), GF (grand_final)', () => {
    const matches = strategy.generateMatches(makeContext(8));
    const wb = matches.filter((m) => m.matchKind === 'main');
    const lb = matches.filter((m) => m.matchKind === 'losers');
    const gf = matches.filter((m) => m.matchKind === 'grand_final');

    expect(wb.length).toBe(7);
    expect(lb.length).toBeGreaterThan(0);
    expect(gf.length).toBe(1);

    expect(wb.every((m) => m.bracketPosition.startsWith('WB-'))).toBe(true);
    expect(lb.every((m) => m.bracketPosition.startsWith('LB-'))).toBe(true);
    expect(gf[0]?.bracketPosition).toBe('GF-1');
  });

  it('LB matches têm TBD labels referenciando losers do WB', () => {
    const matches = strategy.generateMatches(makeContext(8));
    const lbR1 = matches.filter((m) => m.bracketPosition.startsWith('LB-R1-'));
    expect(lbR1.length).toBeGreaterThan(0);
    const first = lbR1[0];
    expect(first?.tbdPlayer1?.source).toBe('winners_bracket_loser');
    expect(first?.tbdPlayer1?.label).toMatch(/^Perdedor WB-/);
    expect(first?.tbdPlayer1?.referenceMatchBracketPosition).toMatch(/^WB-/);
  });

  it('GF tem TBD labels referenciando vencedor WB-F e vencedor LB-F', () => {
    const matches = strategy.generateMatches(makeContext(8));
    const gf = matches.find((m) => m.matchKind === 'grand_final');
    expect(gf?.tbdPlayer1?.source).toBe('winners_bracket_winner');
    expect(gf?.tbdPlayer1?.label).toBe('Vencedor WB-F');
    expect(gf?.tbdPlayer2?.source).toBe('losers_bracket_winner');
    expect(gf?.tbdPlayer2?.label).toBe('Vencedor LB-F');
  });
});
