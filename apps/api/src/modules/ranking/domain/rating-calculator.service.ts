import { Injectable } from '@nestjs/common';
import {
  computeEloDelta,
  computeWinLossDelta,
  type EloConfig,
  type WinLossConfig,
} from '@draftklub/sport-strategies';

export interface RatingDeltaResult {
  player1Delta: number;
  player2Delta: number;
  player1NewRating: number;
  player2NewRating: number;
}

@Injectable()
export class RatingCalculatorService {
  compute(
    engine: string,
    config: Record<string, unknown>,
    player1Rating: number,
    player2Rating: number,
    player1Won: boolean,
  ): RatingDeltaResult {
    switch (engine) {
      case 'elo':
        return this.computeElo(config as unknown as EloConfig, player1Rating, player2Rating, player1Won);
      case 'win_loss':
        return this.computeWinLoss(config as unknown as WinLossConfig, player1Rating, player2Rating, player1Won);
      case 'points':
        return {
          player1Delta: 0,
          player2Delta: 0,
          player1NewRating: player1Rating,
          player2NewRating: player2Rating,
        };
      default:
        throw new Error(`Unknown rating engine: ${engine}`);
    }
  }

  private computeElo(
    config: EloConfig,
    r1: number,
    r2: number,
    p1Won: boolean,
  ): RatingDeltaResult {
    const delta1 = computeEloDelta(r1, r2, p1Won ? 1 : 0, config);
    const delta2 = computeEloDelta(r2, r1, p1Won ? 0 : 1, config);
    return {
      player1Delta: delta1,
      player2Delta: delta2,
      player1NewRating: r1 + delta1,
      player2NewRating: r2 + delta2,
    };
  }

  private computeWinLoss(
    config: WinLossConfig,
    r1: number,
    r2: number,
    p1Won: boolean,
  ): RatingDeltaResult {
    const delta1 = computeWinLossDelta(p1Won, config);
    const delta2 = computeWinLossDelta(!p1Won, config);
    return {
      player1Delta: delta1,
      player2Delta: delta2,
      player1NewRating: Math.max(0, r1 + delta1),
      player2NewRating: Math.max(0, r2 + delta2),
    };
  }
}
