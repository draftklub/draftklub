import { Injectable } from '@nestjs/common';
import { BracketGeneratorService, type PlayerSeed } from '../bracket-generator.service';
import type {
  CategoryWithPlayers,
  DrawContext,
  StrategyGeneratedMatch,
  TbdSlotMetadata,
  TournamentFormatStrategy,
  ValidationResult,
} from './tournament-format.strategy';

const BYE_USER_ID = '__GK_BYE__';

function groupName(index: number): string {
  return String.fromCharCode(65 + index);
}

function positionLabel(pos: number): string {
  return `${pos}º`;
}

@Injectable()
export class GroupsKnockoutStrategy implements TournamentFormatStrategy {
  readonly format = 'groups_knockout';

  constructor(private readonly bracketGenerator: BracketGeneratorService) {}

  validate(context: DrawContext): ValidationResult {
    const errors: string[] = [];
    const config = context.groupsConfig;
    if (!config) {
      errors.push('groups_knockout format requires groupsConfig');
      return { ok: false, errors };
    }
    if (config.numGroups < 2) errors.push('numGroups must be >= 2');
    if (config.advancePerGroup < 1) errors.push('advancePerGroup must be >= 1');
    if (config.advancePerGroup >= Number.MAX_SAFE_INTEGER) {
      errors.push('advancePerGroup out of bounds');
    }

    for (const cat of context.categories) {
      const minPlayers = config.numGroups * 3;
      if (cat.players.length < minPlayers) {
        errors.push(
          `Category '${cat.name}' has ${cat.players.length} players, needs at least ${minPlayers} for ${config.numGroups} groups of 3+`,
        );
      }
      if (cat.players.length < config.numGroups * config.advancePerGroup) {
        errors.push(
          `Category '${cat.name}' has fewer players than advancing slots (${config.numGroups * config.advancePerGroup})`,
        );
      }
    }

    return { ok: errors.length === 0, errors };
  }

  generateMatches(context: DrawContext): StrategyGeneratedMatch[] {
    const config = context.groupsConfig;
    if (!config) return [];

    const result: StrategyGeneratedMatch[] = [];
    for (const category of context.categories) {
      if (category.players.length < config.numGroups * 3) continue;
      result.push(...this.generateCategoryMatches(category, config));
    }
    return result;
  }

  private generateCategoryMatches(
    category: CategoryWithPlayers,
    config: { numGroups: number; advancePerGroup: number },
  ): StrategyGeneratedMatch[] {
    const { numGroups, advancePerGroup } = config;
    const sortedPlayers = [...category.players].sort((a, b) => a.seed - b.seed);

    const groups: PlayerSeed[][] = Array.from({ length: numGroups }, () => []);
    sortedPlayers.forEach((p, idx) => {
      const row = Math.floor(idx / numGroups);
      const colInRow = idx % numGroups;
      const col = row % 2 === 0 ? colInRow : numGroups - 1 - colInRow;
      groups[col]?.push(p);
    });

    const matches: StrategyGeneratedMatch[] = [];

    groups.forEach((players, gIdx) => {
      const name = groupName(gIdx);
      matches.push(...this.generateGroupMatches(category.id, name, players));
    });

    matches.push(...this.generatePostGroupKnockout(category.id, numGroups, advancePerGroup));

    return matches;
  }

  private generateGroupMatches(
    categoryId: string,
    groupId: string,
    players: PlayerSeed[],
  ): StrategyGeneratedMatch[] {
    const matches: StrategyGeneratedMatch[] = [];
    const rotation: PlayerSeed[] = [...players];
    if (rotation.length % 2 !== 0) {
      rotation.push({ userId: BYE_USER_ID, rating: 0, seed: 0 });
    }
    const n = rotation.length;
    const totalRounds = n - 1;
    const pairingsPerRound = n / 2;
    let matchCounter = 1;

    for (let round = 1; round <= totalRounds; round++) {
      for (let i = 0; i < pairingsPerRound; i++) {
        const p1 = rotation[i];
        const p2 = rotation[n - 1 - i];
        if (!p1 || !p2) continue;
        if (p1.userId === BYE_USER_ID || p2.userId === BYE_USER_ID) continue;

        matches.push({
          categoryId,
          matchKind: 'group',
          phase: 'group_stage',
          round,
          bracketPosition: `GRP-${groupId}-${matchCounter}`,
          slotTop: i + 1,
          slotBottom: n - i,
          player1Id: p1.userId,
          player2Id: p2.userId,
          seed1: p1.seed,
          seed2: p2.seed,
          isBye: false,
          nextBracketPosition: null,
          nextMatchSlot: null,
          groupId,
        });
        matchCounter++;
      }
      const last = rotation.pop();
      if (last) rotation.splice(1, 0, last);
    }

    return matches;
  }

  private generatePostGroupKnockout(
    categoryId: string,
    numGroups: number,
    advancePerGroup: number,
  ): StrategyGeneratedMatch[] {
    const seedOrder = this.classicSeedOrder(numGroups, advancePerGroup);

    const pseudoPlayers: PlayerSeed[] = seedOrder.map((slot, idx) => ({
      userId: `GRP-STANDING-${slot.groupId}-${slot.position}`,
      rating: 0,
      seed: idx + 1,
    }));

    const generatedKnockout = this.bracketGenerator.generate(pseudoPlayers);

    const result: StrategyGeneratedMatch[] = [];
    for (const m of generatedKnockout) {
      const tbd1 = this.parseStandingMetadata(m.player1Id);
      const tbd2 = this.parseStandingMetadata(m.player2Id);

      result.push({
        categoryId,
        matchKind: 'main',
        phase: m.phase,
        round: m.round,
        bracketPosition: m.bracketPosition,
        slotTop: m.slotTop,
        slotBottom: m.slotBottom,
        player1Id: null,
        player2Id: null,
        seed1: null,
        seed2: null,
        isBye: m.isBye,
        nextBracketPosition: m.nextBracketPosition,
        nextMatchSlot: m.nextMatchSlot,
        tbdPlayer1: tbd1 ?? undefined,
        tbdPlayer2: tbd2 ?? undefined,
      });
    }
    return result;
  }

  private classicSeedOrder(
    numGroups: number,
    advancePerGroup: number,
  ): { groupId: string; position: number }[] {
    const slots: { groupId: string; position: number }[] = [];
    for (let pos = 1; pos <= advancePerGroup; pos++) {
      for (let g = 0; g < numGroups; g++) {
        const groupIdx = pos % 2 === 1 ? g : numGroups - 1 - g;
        slots.push({ groupId: groupName(groupIdx), position: pos });
      }
    }
    return slots.slice(0, this.nextPowerOfTwo(numGroups * advancePerGroup));
  }

  private nextPowerOfTwo(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  private parseStandingMetadata(userId: string | null): TbdSlotMetadata | null {
    if (!userId?.startsWith('GRP-STANDING-')) return null;
    const parts = userId.slice('GRP-STANDING-'.length).split('-');
    const groupId = parts[0];
    const position = parseInt(parts[1] ?? '0', 10);
    if (!groupId || !position) return null;
    return {
      source: 'group_standing',
      label: `${positionLabel(position)} Grupo ${groupId}`,
      groupId,
      groupPosition: position,
    };
  }

  getInitialStatus(hasPrequalifiers: boolean): string {
    return hasPrequalifiers ? 'prequalifying' : 'in_progress';
  }

  getInitialPhase(_matches: StrategyGeneratedMatch[], hasPrequalifiers: boolean): string | null {
    if (hasPrequalifiers) return 'prequalifier';
    return 'group_stage';
  }
}
