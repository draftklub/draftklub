import { Injectable } from '@nestjs/common';
import type {
  CategoryWithPlayers,
  DrawContext,
  PlayerSeed,
  StrategyGeneratedMatch,
  TournamentFormatStrategy,
  ValidationResult,
} from './tournament-format.strategy';

const BYE_USER_ID = '__RR_BYE__';

@Injectable()
export class RoundRobinStrategy implements TournamentFormatStrategy {
  readonly format = 'round_robin';

  validate(context: DrawContext): ValidationResult {
    const errors: string[] = [];
    let anyValid = false;
    for (const cat of context.categories) {
      if (cat.players.length >= 3) anyValid = true;
      else if (cat.players.length > 0 && cat.players.length < 3) {
        errors.push(`Round-robin requires at least 3 players in category '${cat.name}'`);
      }
    }
    if (!anyValid && errors.length === 0) {
      errors.push('At least one category must have 3 or more players');
    }
    return { ok: errors.length === 0, errors };
  }

  generateMatches(context: DrawContext): StrategyGeneratedMatch[] {
    const result: StrategyGeneratedMatch[] = [];
    for (const category of context.categories) {
      if (category.players.length < 3) continue;
      result.push(...this.generateCategoryMatches(category));
    }
    return result;
  }

  private generateCategoryMatches(category: CategoryWithPlayers): StrategyGeneratedMatch[] {
    const matches: StrategyGeneratedMatch[] = [];
    const rotation: PlayerSeed[] = [...category.players];

    if (rotation.length % 2 !== 0) {
      rotation.push({ userId: BYE_USER_ID, rating: 0, seed: 0 });
    }

    const n = rotation.length;
    const totalRounds = n - 1;
    const pairingsPerRound = n / 2;

    for (let round = 1; round <= totalRounds; round++) {
      for (let i = 0; i < pairingsPerRound; i++) {
        const p1 = rotation[i];
        const p2 = rotation[n - 1 - i];
        if (!p1 || !p2) continue;
        if (p1.userId === BYE_USER_ID || p2.userId === BYE_USER_ID) continue;

        matches.push({
          categoryId: category.id,
          matchKind: 'main',
          phase: `round_${round}`,
          round,
          bracketPosition: `RR-${round}-${i + 1}`,
          slotTop: i + 1,
          slotBottom: n - i,
          player1Id: p1.userId,
          player2Id: p2.userId,
          seed1: p1.seed,
          seed2: p2.seed,
          isBye: false,
          nextBracketPosition: null,
          nextMatchSlot: null,
        });
      }

      const last = rotation.pop();
      if (last) rotation.splice(1, 0, last);
    }

    return matches;
  }

  getInitialStatus(hasPrequalifiers: boolean): string {
    return hasPrequalifiers ? 'prequalifying' : 'in_progress';
  }

  getInitialPhase(matches: StrategyGeneratedMatch[], hasPrequalifiers: boolean): string | null {
    if (hasPrequalifiers) return 'prequalifier';
    return matches.length > 0 ? 'round_1' : null;
  }
}
