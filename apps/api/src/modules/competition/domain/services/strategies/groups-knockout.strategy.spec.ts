import { describe, it, expect, beforeEach } from 'vitest';
import { BracketGeneratorService } from '../bracket-generator.service';
import { GroupsKnockoutStrategy } from './groups-knockout.strategy';
import type { DrawContext } from './tournament-format.strategy';

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `p-${i + 1}`,
    rating: 1500 - i * 25,
    seed: i + 1,
  }));
}

function makeContext(
  playersCount: number,
  groupsConfig: { numGroups: number; advancePerGroup: number } | null = {
    numGroups: 4,
    advancePerGroup: 2,
  },
): DrawContext {
  return {
    tournamentId: 'tour-1',
    format: 'groups_knockout',
    hasPrequalifiers: false,
    groupsConfig,
    categories: [{ id: 'cat-a', name: 'A', order: 0, players: makePlayers(playersCount) }],
  };
}

describe('GroupsKnockoutStrategy', () => {
  let strategy: GroupsKnockoutStrategy;

  beforeEach(() => {
    strategy = new GroupsKnockoutStrategy(new BracketGeneratorService());
  });

  it('validate rejeita se groupsConfig ausente', () => {
    const ctx = makeContext(16, null);
    const result = strategy.validate(ctx);
    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toMatch(/requires groupsConfig/);
  });

  it('validate rejeita categoria com poucos jogadores', () => {
    const ctx = makeContext(6, { numGroups: 4, advancePerGroup: 2 });
    const result = strategy.validate(ctx);
    expect(result.ok).toBe(false);
  });

  it('16 jogadores em 4 grupos gera 24 partidas de grupo (6 por grupo)', () => {
    const matches = strategy.generateMatches(makeContext(16, { numGroups: 4, advancePerGroup: 2 }));
    const groupMatches = matches.filter((m) => m.matchKind === 'group');
    expect(groupMatches.length).toBe(24);
  });

  it('cria 4 grupos nomeados A/B/C/D com 4 jogadores cada (snake order)', () => {
    const matches = strategy.generateMatches(makeContext(16, { numGroups: 4, advancePerGroup: 2 }));
    const groupMatches = matches.filter((m) => m.matchKind === 'group');
    const groupsUsed = new Set(groupMatches.map((m) => m.groupId));
    expect(groupsUsed).toEqual(new Set(['A', 'B', 'C', 'D']));

    const allPlayersInGroupA = new Set<string>();
    groupMatches
      .filter((m) => m.groupId === 'A')
      .forEach((m) => {
        if (m.player1Id) allPlayersInGroupA.add(m.player1Id);
        if (m.player2Id) allPlayersInGroupA.add(m.player2Id);
      });
    expect(allPlayersInGroupA.size).toBe(4);
  });

  it('gera matches de knockout pós-grupos com TBD labels "Nº Grupo X"', () => {
    const matches = strategy.generateMatches(makeContext(16, { numGroups: 4, advancePerGroup: 2 }));
    const knockoutMatches = matches.filter((m) => m.matchKind === 'main');
    expect(knockoutMatches.length).toBeGreaterThan(0);

    const firstKnockout = knockoutMatches.find((m) => m.round === 1);
    expect(firstKnockout?.tbdPlayer1?.source).toBe('group_standing');
    expect(firstKnockout?.tbdPlayer1?.label).toMatch(/^\d+º Grupo [A-D]$/);
    expect(firstKnockout?.tbdPlayer1?.groupId).toBeDefined();
    expect(firstKnockout?.tbdPlayer1?.groupPosition).toBeGreaterThan(0);
  });

  it('distribui jogadores em snake order (seed 1 em A, seed 2 em B, seed 4 em D, seed 5 em D)', () => {
    const matches = strategy.generateMatches(makeContext(16, { numGroups: 4, advancePerGroup: 2 }));
    const groupMatches = matches.filter((m) => m.matchKind === 'group');

    const playersByGroup = new Map<string, Set<string>>();
    for (const m of groupMatches) {
      const set = playersByGroup.get(m.groupId ?? '') ?? new Set<string>();
      if (m.player1Id) set.add(m.player1Id);
      if (m.player2Id) set.add(m.player2Id);
      playersByGroup.set(m.groupId ?? '', set);
    }

    expect(playersByGroup.get('A')?.has('p-1')).toBe(true);
    expect(playersByGroup.get('B')?.has('p-2')).toBe(true);
    expect(playersByGroup.get('D')?.has('p-4')).toBe(true);
    expect(playersByGroup.get('D')?.has('p-5')).toBe(true);
    expect(playersByGroup.get('A')?.has('p-8')).toBe(true);
  });

  it('getInitialPhase retorna group_stage (ou prequalifier se hasPrequalifiers)', () => {
    expect(strategy.getInitialPhase([], false)).toBe('group_stage');
    expect(strategy.getInitialPhase([], true)).toBe('prequalifier');
  });
});
