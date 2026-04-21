import type {
  Match,
  MatchResult,
  RatingDelta,
  SportStrategy,
  TournamentFormat,
} from './sport-strategy.interface.js';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`TennisStrategy.${method} not implemented yet — scheduled for phase 6`);
    this.name = 'NotImplementedError';
  }
}

export class TennisStrategy implements SportStrategy {
  readonly code = 'tennis' as const;

  validateMatchResult(_result: MatchResult): { valid: boolean; errors: string[] } {
    throw new NotImplementedError('validateMatchResult');
  }

  computeRatingDelta(_match: Match): RatingDelta[] {
    throw new NotImplementedError('computeRatingDelta');
  }

  supportedTournamentFormats(): TournamentFormat[] {
    throw new NotImplementedError('supportedTournamentFormats');
  }
}
