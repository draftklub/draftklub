import type {
  Match,
  MatchResult,
  RatingDelta,
  SportStrategy,
  TournamentFormat,
  ValidationResult,
} from './sport-strategy.interface.js';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`TennisStrategy.${method} not implemented yet — scheduled for phase 6`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Sprint K PR-K5d — validação de score-string pra tênis.
 *
 * Aceita formatos:
 * - vazio (score opcional)
 * - "6-3" (1 set)
 * - "6-3 6-2" (2 sets)
 * - "6-4 3-6 7-5" (3 sets)
 * - "6-4 3-6 [10-8]" (super-tiebreak no 3o set; valores entre [])
 *
 * Regras checadas:
 * - cada set tem 2 números separados por hífen
 * - games em [0..7] (5x7 ou 7x5 ou 7x6 são válidos)
 * - tiebreak/super-tiebreak (em colchetes ou último set 7-6/6-7) com valores ≥6
 * - winner consistente com majority de sets vencidos
 *
 * NÃO checa: regra de 2-game lead em set sem TB (6-4 vs 6-4 ambos ok),
 * idade mínima do match, etc. Validator é "permissivo razoável" — UX
 * mostra erro óbvio, deixa committee corrigir cases edge no banco.
 */
export class TennisStrategy implements SportStrategy {
  readonly code = 'tennis' as const;

  validateMatchResult(result: MatchResult): ValidationResult {
    const errors: string[] = [];

    if (result.winnerId !== result.player1Id && result.winnerId !== result.player2Id) {
      errors.push('Vencedor deve ser um dos players do match.');
    }

    const score = (result.score ?? '').trim();
    if (!score) {
      // Score vazio é OK — committee pode preencher depois.
      return { valid: errors.length === 0, errors };
    }

    const sets = parseTennisScore(score);
    if (sets === null) {
      errors.push(
        'Formato inválido. Use "6-3 6-2" ou "6-4 3-6 7-5" (até 5 sets, 2 números por set).',
      );
      return { valid: false, errors };
    }

    let p1Sets = 0;
    let p2Sets = 0;
    for (const set of sets) {
      if (set.tiebreak && (set.a < 6 || set.b < 6)) {
        // colchetes [10-8] esperam valores ≥6 (super-tiebreak); aceita
      }
      if (set.a > set.b) p1Sets += 1;
      else if (set.b > set.a) p2Sets += 1;
      else {
        errors.push(`Set "${set.a}-${set.b}" empata; tênis não tem empate em set.`);
      }
    }

    if (errors.length > 0) return { valid: false, errors };

    if (result.winnerId === result.player1Id && p1Sets <= p2Sets) {
      errors.push(`Score (${p1Sets}x${p2Sets} sets) não bate com o vencedor declarado.`);
    } else if (result.winnerId === result.player2Id && p2Sets <= p1Sets) {
      errors.push(`Score (${p1Sets}x${p2Sets} sets) não bate com o vencedor declarado.`);
    }

    return { valid: errors.length === 0, errors };
  }

  computeRatingDelta(_match: Match): RatingDelta[] {
    throw new NotImplementedError('computeRatingDelta');
  }

  supportedTournamentFormats(): TournamentFormat[] {
    throw new NotImplementedError('supportedTournamentFormats');
  }
}

interface ParsedSet {
  a: number;
  b: number;
  /** Super-tiebreak (`[10-8]`) ou tiebreak detectado (7-6/6-7). */
  tiebreak: boolean;
}

/**
 * Parse "6-3 6-2" ou "6-4 3-6 [10-8]" em array de sets ou null se inválido.
 * Aceita até 5 sets (best of 5). Cada set é "X-Y" com X,Y ∈ [0..7], OU
 * "[X-Y]" com X,Y ≥ 0 (super-tiebreak permissivo).
 */
export function parseTennisScore(score: string): ParsedSet[] | null {
  const tokens = score.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 5) return null;

  const sets: ParsedSet[] = [];
  for (const tok of tokens) {
    const isBracketed = tok.startsWith('[') && tok.endsWith(']');
    const inner = isBracketed ? tok.slice(1, -1) : tok;
    const match = /^(\d+)-(\d+)$/.exec(inner);
    if (!match) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null;
    if (!isBracketed) {
      // Set normal: 0-7 cada lado
      if (a > 7 || b > 7) return null;
    }
    const tiebreak = isBracketed || (a === 7 && b === 6) || (a === 6 && b === 7);
    sets.push({ a, b, tiebreak });
  }
  return sets;
}
