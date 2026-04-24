import { Injectable } from '@nestjs/common';

export interface PlayerSeed {
  userId: string;
  seed: number;
  rating: number;
}

export interface GeneratedMatch {
  bracketPosition: string;
  phase: string;
  round: number;
  slotTop: number;
  slotBottom: number;
  player1Id: string | null;
  player2Id: string | null;
  seed1: number | null;
  seed2: number | null;
  isBye: boolean;
  nextBracketPosition: string | null;
  nextMatchSlot: 'top' | 'bottom' | null;
}

export function generateSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];
  const half = generateSeedOrder(size / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

function getPhaseForMatches(count: number): { phase: string; prefix: string } {
  if (count === 1) return { phase: 'final', prefix: 'F' };
  if (count === 2) return { phase: 'semifinals', prefix: 'SF' };
  if (count === 4) return { phase: 'quarterfinals', prefix: 'QF' };
  const roundSize = count * 2;
  return { phase: `round_of_${roundSize}`, prefix: `R${roundSize}` };
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

@Injectable()
export class BracketGeneratorService {
  generate(players: PlayerSeed[]): GeneratedMatch[] {
    if (players.length < 2) {
      throw new Error('At least 2 players required to generate bracket');
    }

    const sorted = [...players].sort((a, b) => a.seed - b.seed);
    const n = sorted.length;
    const bracketSize = nextPowerOfTwo(n);
    const rounds = Math.log2(bracketSize);

    const seedOrder = generateSeedOrder(bracketSize);
    const slots: (PlayerSeed | null)[] = seedOrder.map((seed) =>
      seed <= n ? (sorted[seed - 1] ?? null) : null,
    );

    const matches: GeneratedMatch[] = [];

    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      const { phase, prefix } = getPhaseForMatches(matchesInRound);

      for (let m = 1; m <= matchesInRound; m++) {
        const bracketPosition = matchesInRound === 1 ? 'F' : `${prefix}-${m}`;
        const slotTop = (m - 1) * 2 + 1;
        const slotBottom = slotTop + 1;

        let player1: PlayerSeed | null = null;
        let player2: PlayerSeed | null = null;
        let isBye = false;

        if (round === 1) {
          player1 = slots[slotTop - 1] ?? null;
          player2 = slots[slotBottom - 1] ?? null;
          isBye = player1 == null || player2 == null;
        }

        let nextBracketPosition: string | null = null;
        let nextMatchSlot: 'top' | 'bottom' | null = null;
        if (round < rounds) {
          const nextMatchIdx = Math.ceil(m / 2);
          const nextMatchesInRound = matchesInRound / 2;
          const nextPhase = getPhaseForMatches(nextMatchesInRound);
          nextBracketPosition =
            nextMatchesInRound === 1 ? 'F' : `${nextPhase.prefix}-${nextMatchIdx}`;
          nextMatchSlot = m % 2 === 1 ? 'top' : 'bottom';
        }

        matches.push({
          bracketPosition,
          phase,
          round,
          slotTop,
          slotBottom,
          player1Id: player1?.userId ?? null,
          player2Id: player2?.userId ?? null,
          seed1: player1?.seed ?? null,
          seed2: player2?.seed ?? null,
          isBye,
          nextBracketPosition,
          nextMatchSlot,
        });
      }
    }

    return matches;
  }
}
