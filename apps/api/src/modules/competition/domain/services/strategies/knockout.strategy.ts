import { Injectable } from '@nestjs/common';
import { BracketGeneratorService } from '../bracket-generator.service';
import type {
  DrawContext,
  StrategyGeneratedMatch,
  TournamentFormatStrategy,
  ValidationResult,
} from './tournament-format.strategy';

@Injectable()
export class KnockoutStrategy implements TournamentFormatStrategy {
  readonly format = 'knockout';

  constructor(private readonly bracketGenerator: BracketGeneratorService) {}

  validate(context: DrawContext): ValidationResult {
    const errors: string[] = [];
    const hasAnyCategoryWithPlayers = context.categories.some((c) => c.players.length >= 2);
    if (!hasAnyCategoryWithPlayers) {
      errors.push('At least one category must have 2 or more players');
    }
    return { ok: errors.length === 0, errors };
  }

  generateMatches(context: DrawContext): StrategyGeneratedMatch[] {
    const result: StrategyGeneratedMatch[] = [];

    for (const category of context.categories) {
      if (category.players.length < 2) continue;

      const generated = this.bracketGenerator.generate(category.players);

      for (const m of generated) {
        result.push({
          categoryId: category.id,
          matchKind: 'main',
          phase: m.phase,
          round: m.round,
          bracketPosition: m.bracketPosition,
          slotTop: m.slotTop,
          slotBottom: m.slotBottom,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          seed1: m.seed1,
          seed2: m.seed2,
          isBye: m.isBye,
          nextBracketPosition: m.nextBracketPosition,
          nextMatchSlot: m.nextMatchSlot,
        });
      }
    }

    return result;
  }

  getInitialStatus(hasPrequalifiers: boolean): string {
    return hasPrequalifiers ? 'prequalifying' : 'in_progress';
  }

  getInitialPhase(matches: StrategyGeneratedMatch[], hasPrequalifiers: boolean): string | null {
    if (hasPrequalifiers) return 'prequalifier';
    const firstRound = matches.find((m) => m.round === 1);
    return firstRound?.phase ?? null;
  }
}
