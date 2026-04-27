export type {
  Match,
  MatchResult,
  RatingDelta,
  SportStrategy,
  TournamentFormat,
} from './sport-strategy.interface.js';
export { TennisStrategy } from './tennis.strategy.js';

export type RatingEngineCode = 'elo' | 'points' | 'win_loss';

export interface EloConfig {
  kFactor: number;
  kFactorHigh: number;
  kThreshold: number;
  initialRating: number;
}

export interface PointsConfig {
  champion: number;
  runnerUp: number;
  semi: number;
  quarter: number;
  roundOf16: number;
  topN: number;
}

export interface WinLossConfig {
  win: number;
  loss: number;
  decayPerWeek: number;
  minRating: number;
}

export type RatingConfig = EloConfig | PointsConfig | WinLossConfig;

export function computeEloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function computeEloDelta(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  config: EloConfig,
): number {
  const expected = computeEloExpected(ratingA, ratingB);
  const k = ratingA >= config.kThreshold ? config.kFactorHigh : config.kFactor;
  return Math.round(k * (scoreA - expected));
}

// ─── Points engine ──────────────────────────────────────────────

export interface TournamentFinish {
  position: 'champion' | 'runner_up' | 'semi' | 'quarter' | 'round_of_16' | 'participant';
}

export function computePointsDelta(finish: TournamentFinish, config: PointsConfig): number {
  switch (finish.position) {
    case 'champion':
      return config.champion;
    case 'runner_up':
      return config.runnerUp;
    case 'semi':
      return config.semi;
    case 'quarter':
      return config.quarter;
    case 'round_of_16':
      return config.roundOf16;
    default:
      return 0;
  }
}

// ─── Win/Loss engine ────────────────────────────────────────────

export function computeWinLossDelta(won: boolean, config: WinLossConfig): number {
  return won ? config.win : config.loss;
}

export function computeWinLossDecay(weeksInactive: number, config: WinLossConfig): number {
  return Math.max(config.minRating, weeksInactive * config.decayPerWeek);
}
