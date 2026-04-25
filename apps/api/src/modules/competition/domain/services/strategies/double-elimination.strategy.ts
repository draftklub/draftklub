import { Injectable } from '@nestjs/common';
import { BracketGeneratorService } from '../bracket-generator.service';
import type {
  CategoryWithPlayers,
  DrawContext,
  StrategyGeneratedMatch,
  TournamentFormatStrategy,
  ValidationResult,
} from './tournament-format.strategy';

@Injectable()
export class DoubleEliminationStrategy implements TournamentFormatStrategy {
  readonly format = 'double_elimination';

  constructor(private readonly bracketGenerator: BracketGeneratorService) {}

  validate(context: DrawContext): ValidationResult {
    const errors: string[] = [];
    const anyValid = context.categories.some((c) => c.players.length >= 4);
    if (!anyValid) {
      errors.push('Double elimination requires at least 4 players in a category');
    }
    return { ok: errors.length === 0, errors };
  }

  generateMatches(context: DrawContext): StrategyGeneratedMatch[] {
    const result: StrategyGeneratedMatch[] = [];
    for (const category of context.categories) {
      if (category.players.length < 4) continue;
      result.push(...this.generateForCategory(category));
    }
    return result;
  }

  private generateForCategory(category: CategoryWithPlayers): StrategyGeneratedMatch[] {
    const wbRaw = this.bracketGenerator.generate(category.players);
    const matches: StrategyGeneratedMatch[] = [];

    for (const m of wbRaw) {
      matches.push({
        categoryId: category.id,
        matchKind: 'main',
        phase: m.phase,
        round: m.round,
        bracketPosition: `WB-${m.bracketPosition}`,
        slotTop: m.slotTop,
        slotBottom: m.slotBottom,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        seed1: m.seed1,
        seed2: m.seed2,
        isBye: m.isBye,
        nextBracketPosition: m.nextBracketPosition ? `WB-${m.nextBracketPosition}` : null,
        nextMatchSlot: m.nextMatchSlot,
      });
    }

    const wbFinalBracketPosition = 'WB-F';
    const firstRoundWbPositions = wbRaw
      .filter((m) => m.round === 1 && !m.isBye)
      .map((m) => `WB-${m.bracketPosition}`);

    const lbR1Matches: StrategyGeneratedMatch[] = [];
    for (let i = 0; i < Math.floor(firstRoundWbPositions.length / 2); i++) {
      const upper = firstRoundWbPositions[i * 2];
      const lower = firstRoundWbPositions[i * 2 + 1];
      if (!upper || !lower) continue;
      lbR1Matches.push({
        categoryId: category.id,
        matchKind: 'losers',
        phase: 'losers_bracket',
        round: 1,
        bracketPosition: `LB-R1-${i + 1}`,
        slotTop: i * 2 + 1,
        slotBottom: i * 2 + 2,
        player1Id: null,
        player2Id: null,
        seed1: null,
        seed2: null,
        isBye: false,
        nextBracketPosition: 'LB-F',
        nextMatchSlot: i % 2 === 0 ? 'top' : 'bottom',
        tbdPlayer1: {
          source: 'winners_bracket_loser',
          label: `Perdedor ${upper}`,
          referenceMatchBracketPosition: upper,
        },
        tbdPlayer2: {
          source: 'winners_bracket_loser',
          label: `Perdedor ${lower}`,
          referenceMatchBracketPosition: lower,
        },
      });
    }
    matches.push(...lbR1Matches);

    const lbFinal: StrategyGeneratedMatch = {
      categoryId: category.id,
      matchKind: 'losers',
      phase: 'losers_final',
      round: 2,
      bracketPosition: 'LB-F',
      slotTop: 1,
      slotBottom: 2,
      player1Id: null,
      player2Id: null,
      seed1: null,
      seed2: null,
      isBye: false,
      nextBracketPosition: 'GF-1',
      nextMatchSlot: 'bottom',
      tbdPlayer1: {
        source: 'losers_bracket_winner',
        label: 'Vencedor LB-R1',
      },
      tbdPlayer2: {
        source: 'winners_bracket_loser',
        label: `Perdedor ${wbFinalBracketPosition}`,
        referenceMatchBracketPosition: wbFinalBracketPosition,
      },
    };
    matches.push(lbFinal);

    const grandFinal: StrategyGeneratedMatch = {
      categoryId: category.id,
      matchKind: 'grand_final',
      phase: 'grand_final',
      round: 3,
      bracketPosition: 'GF-1',
      slotTop: 1,
      slotBottom: 2,
      player1Id: null,
      player2Id: null,
      seed1: null,
      seed2: null,
      isBye: false,
      nextBracketPosition: null,
      nextMatchSlot: null,
      tbdPlayer1: {
        source: 'winners_bracket_winner',
        label: `Vencedor ${wbFinalBracketPosition}`,
        referenceMatchBracketPosition: wbFinalBracketPosition,
      },
      tbdPlayer2: {
        source: 'losers_bracket_winner',
        label: 'Vencedor LB-F',
        referenceMatchBracketPosition: 'LB-F',
      },
    };
    matches.push(grandFinal);

    return matches;
  }

  getInitialStatus(hasPrequalifiers: boolean): string {
    return hasPrequalifiers ? 'prequalifying' : 'in_progress';
  }

  getInitialPhase(_matches: StrategyGeneratedMatch[], hasPrequalifiers: boolean): string | null {
    if (hasPrequalifiers) return 'prequalifier';
    return 'wb_round_1';
  }
}
