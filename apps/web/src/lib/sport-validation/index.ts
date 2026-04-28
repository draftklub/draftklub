import { TennisStrategy, type ValidationResult } from '@draftklub/sport-strategies';

/**
 * Sprint K PR-K5d — facade pra validação de score por sport. Hoje só
 * tennis tem strategy real; outros sports caem em "valid" sem checar
 * (forms aceitam qualquer string de score).
 *
 * UX: chama no submit do form pra evitar 400 do backend, mostra
 * mensagens em pt-br vindas direto da strategy.
 */
const TENNIS = new TennisStrategy();

export function validateMatchScore(
  sportCode: string,
  input: { winnerId: string; player1Id: string; player2Id: string; score?: string },
): ValidationResult {
  if (sportCode === 'tennis') {
    return TENNIS.validateMatchResult(input);
  }
  // Padel/squash/beach_tennis ainda sem strategy concreta — aceita.
  return { valid: true, errors: [] };
}
