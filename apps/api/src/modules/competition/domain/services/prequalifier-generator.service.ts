import { Injectable, BadRequestException } from '@nestjs/common';

export interface CategoryWithPlayers {
  id: string;
  name: string;
  order: number;
  players: {
    userId: string;
    rating: number;
    seed: number;
  }[];
}

export interface PrequalifierPairing {
  frontierUpper: string;
  frontierLower: string;
  pairIndex: number;
  upperPlayerId: string;
  upperSeed: number;
  lowerPlayerId: string;
  lowerSeed: number;
  upperCategoryId: string;
  lowerCategoryId: string;
}

@Injectable()
export class PrequalifierGeneratorService {
  generate(
    categories: CategoryWithPlayers[],
    bordersPerFrontier: number,
  ): PrequalifierPairing[] {
    if (bordersPerFrontier < 1) {
      throw new BadRequestException('bordersPerFrontier must be >= 1');
    }
    if (categories.length < 2) {
      throw new BadRequestException('Need at least 2 categories for prequalifiers');
    }

    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const pairings: PrequalifierPairing[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const upper = sorted[i];
      const lower = sorted[i + 1];
      if (!upper || !lower) continue;

      if (upper.players.length < bordersPerFrontier) {
        throw new BadRequestException(
          `Category '${upper.name}' has ${upper.players.length} players, needs at least ${bordersPerFrontier} for prequalifier`,
        );
      }
      if (lower.players.length < bordersPerFrontier) {
        throw new BadRequestException(
          `Category '${lower.name}' has ${lower.players.length} players, needs at least ${bordersPerFrontier} for prequalifier`,
        );
      }

      const upperSorted = [...upper.players].sort((a, b) => a.seed - b.seed);
      const lowerSorted = [...lower.players].sort((a, b) => a.seed - b.seed);

      const upperBottom = upperSorted.slice(-bordersPerFrontier);
      const lowerTop = lowerSorted.slice(0, bordersPerFrontier);

      for (let pairIdx = 0; pairIdx < bordersPerFrontier; pairIdx++) {
        const upperPlayer = upperBottom[pairIdx];
        const lowerPlayer = lowerTop[pairIdx];
        if (!upperPlayer || !lowerPlayer) continue;

        pairings.push({
          frontierUpper: upper.name,
          frontierLower: lower.name,
          pairIndex: pairIdx + 1,
          upperPlayerId: upperPlayer.userId,
          upperSeed: upperPlayer.seed,
          lowerPlayerId: lowerPlayer.userId,
          lowerSeed: lowerPlayer.seed,
          upperCategoryId: upper.id,
          lowerCategoryId: lower.id,
        });
      }
    }

    return pairings;
  }
}
