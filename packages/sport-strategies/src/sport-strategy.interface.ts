export interface MatchResult {
  /* a definir na fase 6 */
}

export interface Match {
  /* a definir na fase 6 */
}

export interface RatingDelta {
  userId: string;
  delta: number;
}

export interface TournamentFormat {
  code: string;
  name: string;
}

export interface SportStrategy {
  readonly code: 'tennis' | 'squash' | 'padel' | 'beach_tennis';
  validateMatchResult(result: MatchResult): { valid: boolean; errors: string[] };
  computeRatingDelta(match: Match): RatingDelta[];
  supportedTournamentFormats(): TournamentFormat[];
}
