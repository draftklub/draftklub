/**
 * Sprint K PR-K5d — concretiza MatchResult shape pra validação.
 * Match e TournamentFormat ficam stubs até as outras strategies (padel,
 * squash, beach_tennis) ganharem implementações reais.
 */
export interface MatchResult {
  /** UUID do player vencedor; precisa estar entre player1Id/player2Id. */
  winnerId: string;
  player1Id: string;
  player2Id: string;
  /** Score livre. Validators interpretam por sport (ex: "6-3 6-2"). */
  score?: string;
}

export interface Match {
  /* a definir nas strategies de cada modalidade */
}

export interface RatingDelta {
  userId: string;
  delta: number;
}

export interface TournamentFormat {
  code: string;
  name: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SportStrategy {
  readonly code: 'tennis' | 'squash' | 'padel' | 'beach_tennis';
  validateMatchResult(result: MatchResult): ValidationResult;
  computeRatingDelta(match: Match): RatingDelta[];
  supportedTournamentFormats(): TournamentFormat[];
}
