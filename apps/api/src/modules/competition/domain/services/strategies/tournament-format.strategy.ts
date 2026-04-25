export interface PlayerSeed {
  userId: string;
  rating: number;
  seed: number;
}

export interface CategoryWithPlayers {
  id: string;
  name: string;
  order: number;
  players: PlayerSeed[];
}

export interface DrawContext {
  tournamentId: string;
  format: string;
  hasPrequalifiers: boolean;
  groupsConfig?: { numGroups: number; advancePerGroup: number } | null;
  categories: CategoryWithPlayers[];
}

export type TbdSource =
  | 'group_standing'
  | 'winners_bracket_loser'
  | 'losers_bracket_winner'
  | 'winners_bracket_winner';

export interface TbdSlotMetadata {
  source: TbdSource;
  label: string;
  groupId?: string;
  groupPosition?: number;
  referenceMatchBracketPosition?: string;
}

export interface StrategyGeneratedMatch {
  categoryId: string;
  matchKind: 'main' | 'group' | 'losers' | 'grand_final';
  phase: string;
  round: number;
  bracketPosition: string;
  slotTop: number;
  slotBottom: number;
  player1Id: string | null;
  player2Id: string | null;
  seed1: number | null;
  seed2: number | null;
  isBye: boolean;
  nextBracketPosition: string | null;
  nextMatchSlot: 'top' | 'bottom' | null;
  groupId?: string | null;
  tbdPlayer1?: TbdSlotMetadata;
  tbdPlayer2?: TbdSlotMetadata;
}

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface TournamentFormatStrategy {
  readonly format: string;

  validate(context: DrawContext): ValidationResult;

  generateMatches(context: DrawContext): StrategyGeneratedMatch[];

  getInitialStatus(hasPrequalifiers: boolean): string;

  getInitialPhase(
    matches: StrategyGeneratedMatch[],
    hasPrequalifiers: boolean,
  ): string | null;
}
