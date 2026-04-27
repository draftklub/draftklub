import { describe, it, expect } from 'vitest';
import { computePointsDelta, computeWinLossDelta, computeWinLossDecay } from './index';

const pointsConfig = {
  champion: 100,
  runnerUp: 70,
  semi: 40,
  quarter: 20,
  roundOf16: 10,
  topN: 4,
};

const winLossConfig = {
  win: 25,
  loss: -10,
  decayPerWeek: -5,
  minRating: -100,
};

describe('Points engine', () => {
  it('campeão recebe pontuação máxima', () => {
    expect(computePointsDelta({ position: 'champion' }, pointsConfig)).toBe(100);
  });
  it('vice recebe segunda pontuação', () => {
    expect(computePointsDelta({ position: 'runner_up' }, pointsConfig)).toBe(70);
  });
  it('participante sem colocação recebe 0', () => {
    expect(computePointsDelta({ position: 'participant' }, pointsConfig)).toBe(0);
  });
});

describe('Win/Loss engine', () => {
  it('vitória adiciona pontos', () => {
    expect(computeWinLossDelta(true, winLossConfig)).toBe(25);
  });
  it('derrota remove pontos', () => {
    expect(computeWinLossDelta(false, winLossConfig)).toBe(-10);
  });
  it('decay por inatividade é negativo', () => {
    expect(computeWinLossDecay(2, winLossConfig)).toBe(-10);
  });
  it('decay não vai abaixo do mínimo', () => {
    const config = { ...winLossConfig, minRating: -20 };
    expect(computeWinLossDecay(100, config)).toBe(-20);
  });
});
