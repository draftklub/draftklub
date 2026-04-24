import { describe, it, expect } from 'vitest';
import { computeEloDelta, computeEloExpected } from './index';

const defaultConfig = {
  kFactor: 32,
  kFactorHigh: 16,
  kThreshold: 1400,
  initialRating: 1000,
};

describe('ELO', () => {
  it('jogadores iguais — vitória dá ~16 pontos', () => {
    const delta = computeEloDelta(1000, 1000, 1, defaultConfig);
    expect(delta).toBe(16);
  });

  it('jogadores iguais — derrota tira ~16 pontos', () => {
    const delta = computeEloDelta(1000, 1000, 0, defaultConfig);
    expect(delta).toBe(-16);
  });

  it('favorito vence — ganho menor', () => {
    const delta = computeEloDelta(1200, 1000, 1, defaultConfig);
    expect(delta).toBeLessThan(16);
  });

  it('azarão vence — ganho maior', () => {
    const delta = computeEloDelta(1000, 1200, 1, defaultConfig);
    expect(delta).toBeGreaterThan(16);
  });

  it('rating alto usa kFactorHigh', () => {
    const deltaHigh = computeEloDelta(1500, 1500, 1, defaultConfig);
    const deltaLow = computeEloDelta(1000, 1000, 1, defaultConfig);
    expect(deltaHigh).toBeLessThan(deltaLow);
  });

  it('probabilidade esperada entre jogadores iguais é 0.5', () => {
    const expected = computeEloExpected(1000, 1000);
    expect(expected).toBeCloseTo(0.5);
  });

  it('favorito tem probabilidade maior que 0.5', () => {
    const expected = computeEloExpected(1200, 1000);
    expect(expected).toBeGreaterThan(0.5);
  });
});
