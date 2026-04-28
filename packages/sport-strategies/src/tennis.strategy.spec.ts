import { describe, it, expect } from 'vitest';
import { TennisStrategy, parseTennisScore } from './tennis.strategy.js';

const P1 = '00000000-0000-0000-0000-000000000001';
const P2 = '00000000-0000-0000-0000-000000000002';

describe('parseTennisScore', () => {
  it('aceita 1 set', () => {
    expect(parseTennisScore('6-3')).toEqual([{ a: 6, b: 3, tiebreak: false }]);
  });

  it('aceita 2 sets', () => {
    expect(parseTennisScore('6-3 6-2')).toEqual([
      { a: 6, b: 3, tiebreak: false },
      { a: 6, b: 2, tiebreak: false },
    ]);
  });

  it('aceita 3 sets com tiebreak no terceiro (7-6)', () => {
    expect(parseTennisScore('6-4 3-6 7-6')).toEqual([
      { a: 6, b: 4, tiebreak: false },
      { a: 3, b: 6, tiebreak: false },
      { a: 7, b: 6, tiebreak: true },
    ]);
  });

  it('aceita super-tiebreak [10-8]', () => {
    expect(parseTennisScore('6-4 3-6 [10-8]')).toEqual([
      { a: 6, b: 4, tiebreak: false },
      { a: 3, b: 6, tiebreak: false },
      { a: 10, b: 8, tiebreak: true },
    ]);
  });

  it('rejeita formato sem hífen', () => {
    expect(parseTennisScore('63 62')).toBeNull();
  });

  it('rejeita >5 sets', () => {
    expect(parseTennisScore('6-3 6-3 6-3 6-3 6-3 6-3')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseTennisScore('')).toBeNull();
  });

  it('rejeita números > 7 fora de bracket', () => {
    expect(parseTennisScore('8-3')).toBeNull();
  });

  it('aceita números > 7 dentro de bracket (super-tiebreak)', () => {
    expect(parseTennisScore('[10-8]')).toEqual([{ a: 10, b: 8, tiebreak: true }]);
  });
});

describe('TennisStrategy.validateMatchResult', () => {
  const strategy = new TennisStrategy();

  it('valida com winner consistente', () => {
    const result = strategy.validateMatchResult({
      winnerId: P1,
      player1Id: P1,
      player2Id: P2,
      score: '6-3 6-2',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('aceita score vazio', () => {
    const result = strategy.validateMatchResult({
      winnerId: P1,
      player1Id: P1,
      player2Id: P2,
    });
    expect(result.valid).toBe(true);
  });

  it('rejeita winner que não é nenhum dos players', () => {
    const result = strategy.validateMatchResult({
      winnerId: 'outro-uuid',
      player1Id: P1,
      player2Id: P2,
      score: '6-3 6-2',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Vencedor/);
  });

  it('rejeita score que não bate com winner declarado', () => {
    const result = strategy.validateMatchResult({
      winnerId: P1,
      player1Id: P1,
      player2Id: P2,
      score: '3-6 2-6', // P2 venceu
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/não bate/);
  });

  it('rejeita formato de score inválido', () => {
    const result = strategy.validateMatchResult({
      winnerId: P1,
      player1Id: P1,
      player2Id: P2,
      score: 'lol',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Formato inválido/);
  });

  it('rejeita set com empate', () => {
    const result = strategy.validateMatchResult({
      winnerId: P1,
      player1Id: P1,
      player2Id: P2,
      score: '6-6 6-3',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/empata/);
  });

  it('valida 3-set match com super-tiebreak', () => {
    const result = strategy.validateMatchResult({
      winnerId: P2,
      player1Id: P1,
      player2Id: P2,
      score: '4-6 6-3 [8-10]',
    });
    expect(result.valid).toBe(true);
  });
});
