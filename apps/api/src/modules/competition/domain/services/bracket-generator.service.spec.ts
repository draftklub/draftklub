import { describe, it, expect, beforeEach } from 'vitest';
import {
  BracketGeneratorService,
  generateSeedOrder,
  type PlayerSeed,
} from './bracket-generator.service';

function makePlayers(n: number): PlayerSeed[] {
  return Array.from({ length: n }, (_, i) => ({
    userId: `player-${i + 1}`,
    seed: i + 1,
    rating: 2000 - i * 50,
  }));
}

describe('generateSeedOrder', () => {
  it('recursão — size 2 retorna [1, 2]', () => {
    expect(generateSeedOrder(2)).toEqual([1, 2]);
  });

  it('recursão — size 8 intercala seeds corretamente', () => {
    const order = generateSeedOrder(8);
    expect(order.length).toBe(8);
    const pairs: [number, number][] = [];
    for (let i = 0; i < order.length; i += 2) {
      const a = order[i] ?? 0;
      const b = order[i + 1] ?? 0;
      pairs.push([Math.min(a, b), Math.max(a, b)]);
    }

    expect(pairs).toContainEqual([1, 8]);
    expect(pairs).toContainEqual([4, 5]);
    expect(pairs).toContainEqual([3, 6]);
    expect(pairs).toContainEqual([2, 7]);
  });
});

describe('BracketGeneratorService', () => {
  let service: BracketGeneratorService;

  beforeEach(() => {
    service = new BracketGeneratorService();
  });

  it('lança erro com menos de 2 jogadores', () => {
    expect(() => service.generate([])).toThrow('At least 2 players');
    expect(() => service.generate(makePlayers(1))).toThrow('At least 2 players');
  });

  it('gera 3 matches para 4 jogadores (SF + SF + F)', () => {
    const matches = service.generate(makePlayers(4));
    expect(matches.length).toBe(3);
    const phases = matches.map((m) => m.phase);
    expect(phases.filter((p) => p === 'semifinals').length).toBe(2);
    expect(phases.filter((p) => p === 'final').length).toBe(1);
  });

  it('gera 7 matches para 8 jogadores', () => {
    const matches = service.generate(makePlayers(8));
    expect(matches.length).toBe(7);
  });

  it('gera 15 matches para 16 jogadores', () => {
    const matches = service.generate(makePlayers(16));
    expect(matches.length).toBe(15);
  });

  it('pares ATP no bracket 8: (1,8), (4,5), (3,6), (2,7)', () => {
    const matches = service.generate(makePlayers(8));
    const r1 = matches.filter((m) => m.round === 1);
    expect(r1.length).toBe(4);

    const pairs = r1.map((m) => {
      const a = m.seed1 ?? 0;
      const b = m.seed2 ?? 0;
      return [Math.min(a, b), Math.max(a, b)];
    });

    expect(pairs).toContainEqual([1, 8]);
    expect(pairs).toContainEqual([4, 5]);
    expect(pairs).toContainEqual([3, 6]);
    expect(pairs).toContainEqual([2, 7]);
  });

  it('2 byes para 6 jogadores (bracket 8)', () => {
    const matches = service.generate(makePlayers(6));
    const r1 = matches.filter((m) => m.round === 1);
    const byes = r1.filter((m) => m.isBye);
    expect(byes.length).toBe(2);
  });

  it('3 byes para 5 jogadores (bracket 8)', () => {
    const matches = service.generate(makePlayers(5));
    const r1 = matches.filter((m) => m.round === 1);
    const byes = r1.filter((m) => m.isBye);
    expect(byes.length).toBe(3);
  });

  it('5 byes para 11 jogadores (bracket 16)', () => {
    const matches = service.generate(makePlayers(11));
    const r1 = matches.filter((m) => m.round === 1);
    const byes = r1.filter((m) => m.isBye);
    expect(byes.length).toBe(5);
  });

  it('nextBracketPosition de primeira rodada aponta para rodada seguinte', () => {
    const matches = service.generate(makePlayers(8));
    const r1 = matches.filter((m) => m.round === 1);
    for (const m of r1) {
      expect(m.nextBracketPosition).toMatch(/^SF-/);
    }
    const finalMatch = matches.find((m) => m.phase === 'final');
    expect(finalMatch?.nextBracketPosition).toBeNull();
  });

  it('QF-1 e QF-2 apontam para SF-1 (top e bottom)', () => {
    const matches = service.generate(makePlayers(16));
    const qf1 = matches.find((m) => m.bracketPosition === 'QF-1');
    const qf2 = matches.find((m) => m.bracketPosition === 'QF-2');
    expect(qf1?.nextBracketPosition).toBe('SF-1');
    expect(qf1?.nextMatchSlot).toBe('top');
    expect(qf2?.nextBracketPosition).toBe('SF-1');
    expect(qf2?.nextMatchSlot).toBe('bottom');
  });
});
