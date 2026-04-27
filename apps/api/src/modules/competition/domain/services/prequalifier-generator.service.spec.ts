import { describe, it, expect, beforeEach } from 'vitest';
import { PrequalifierGeneratorService } from './prequalifier-generator.service';

describe('PrequalifierGeneratorService', () => {
  let service: PrequalifierGeneratorService;

  const makePlayers = (count: number, offset = 0) =>
    Array.from({ length: count }, (_, i) => ({
      userId: `player-${i + 1 + offset}`,
      rating: 1500 - (i + offset) * 50,
      seed: i + 1,
    }));

  beforeEach(() => {
    service = new PrequalifierGeneratorService();
  });

  it('2 categorias com N=1 gera 1 pairing', () => {
    const categories = [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(4) },
      { id: 'cat-b', name: 'B', order: 1, players: makePlayers(4, 10) },
    ];
    const pairings = service.generate(categories, 1);
    expect(pairings).toHaveLength(1);
    expect(pairings[0]?.frontierUpper).toBe('A');
    expect(pairings[0]?.frontierLower).toBe('B');
  });

  it('2 categorias com N=2 gera 2 pairings', () => {
    const categories = [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(4) },
      { id: 'cat-b', name: 'B', order: 1, players: makePlayers(4, 10) },
    ];
    const pairings = service.generate(categories, 2);
    expect(pairings).toHaveLength(2);
    expect(pairings[0]?.pairIndex).toBe(1);
    expect(pairings[1]?.pairIndex).toBe(2);
  });

  it('4 categorias com N=2 gera 6 pairings (3 fronteiras x 2)', () => {
    const categories = [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(4) },
      { id: 'cat-b', name: 'B', order: 1, players: makePlayers(4, 10) },
      { id: 'cat-c', name: 'C', order: 2, players: makePlayers(4, 20) },
      { id: 'cat-d', name: 'D', order: 3, players: makePlayers(4, 30) },
    ];
    const pairings = service.generate(categories, 2);
    expect(pairings).toHaveLength(6);
    expect(pairings.filter((p) => p.frontierUpper === 'A')).toHaveLength(2);
    expect(pairings.filter((p) => p.frontierUpper === 'B')).toHaveLength(2);
    expect(pairings.filter((p) => p.frontierUpper === 'C')).toHaveLength(2);
  });

  it('pega últimos N de upper e primeiros N de lower', () => {
    const categoryA = {
      id: 'cat-a',
      name: 'A',
      order: 0,
      players: [
        { userId: 'A1', rating: 1500, seed: 1 },
        { userId: 'A2', rating: 1400, seed: 2 },
        { userId: 'A3', rating: 1300, seed: 3 },
        { userId: 'A4', rating: 1200, seed: 4 },
      ],
    };
    const categoryB = {
      id: 'cat-b',
      name: 'B',
      order: 1,
      players: [
        { userId: 'B1', rating: 1150, seed: 1 },
        { userId: 'B2', rating: 1100, seed: 2 },
        { userId: 'B3', rating: 1050, seed: 3 },
        { userId: 'B4', rating: 1000, seed: 4 },
      ],
    };
    const pairings = service.generate([categoryA, categoryB], 2);
    expect(pairings[0]?.upperPlayerId).toBe('A3');
    expect(pairings[0]?.lowerPlayerId).toBe('B1');
    expect(pairings[1]?.upperPlayerId).toBe('A4');
    expect(pairings[1]?.lowerPlayerId).toBe('B2');
  });

  it('rejeita se categoria nao tem jogadores suficientes', () => {
    const categories = [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(1) },
      { id: 'cat-b', name: 'B', order: 1, players: makePlayers(4) },
    ];
    expect(() => service.generate(categories, 2)).toThrow(
      "Category 'A' has 1 players, needs at least 2",
    );
  });

  it('rejeita se menos de 2 categorias', () => {
    const categories = [{ id: 'cat-a', name: 'A', order: 0, players: makePlayers(4) }];
    expect(() => service.generate(categories, 1)).toThrow('Need at least 2 categories');
  });

  it('rejeita se bordersPerFrontier < 1', () => {
    const categories = [
      { id: 'cat-a', name: 'A', order: 0, players: makePlayers(4) },
      { id: 'cat-b', name: 'B', order: 1, players: makePlayers(4) },
    ];
    expect(() => service.generate(categories, 0)).toThrow('bordersPerFrontier');
  });
});
