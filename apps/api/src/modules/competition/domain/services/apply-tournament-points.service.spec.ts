import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplyTournamentPointsService } from './apply-tournament-points.service';

interface MockTx {
  tournament: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  playerRankingEntry: {
    upsert: ReturnType<typeof vi.fn>;
  };
}

function makeTx(): MockTx {
  return {
    tournament: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    playerRankingEntry: { upsert: vi.fn().mockResolvedValue({}) },
  };
}

const baseSchema = { champion: 100, runner_up: 70, semi: 40 };

describe('ApplyTournamentPointsService', () => {
  let service: ApplyTournamentPointsService;

  beforeEach(() => {
    service = new ApplyTournamentPointsService();
  });

  it('aplica pontos por categoria + finalPosition', async () => {
    const tx = makeTx();
    tx.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      rankingId: 'rank-1',
      pointsApplied: false,
      ranking: { includesTournamentPoints: true },
      categories: [{ id: 'cat-a', pointsSchema: { points: baseSchema } }],
      entries: [
        { userId: 'p1', categoryId: 'cat-a', finalPosition: 'champion' },
        { userId: 'p2', categoryId: 'cat-a', finalPosition: 'runner_up' },
        { userId: 'p3', categoryId: 'cat-a', finalPosition: 'semi' },
      ],
    });

    const result = await service.apply(tx, 'tour-1');

    expect(result.applied).toBe(3);
    expect(tx.playerRankingEntry.upsert).toHaveBeenCalledTimes(3);
    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: expect.objectContaining({ pointsApplied: true }) as object,
    });
  });

  it('idempotente: nao aplica se pointsApplied=true', async () => {
    const tx = makeTx();
    tx.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      rankingId: 'rank-1',
      pointsApplied: true,
      ranking: { includesTournamentPoints: true },
      categories: [],
      entries: [],
    });

    const result = await service.apply(tx, 'tour-1');

    expect(result.applied).toBe(0);
    expect(tx.playerRankingEntry.upsert).not.toHaveBeenCalled();
    expect(tx.tournament.update).not.toHaveBeenCalled();
  });

  it('ranking sem includesTournamentPoints: marca aplicado com 0 pontos (evita retentativas)', async () => {
    const tx = makeTx();
    tx.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      rankingId: 'rank-1',
      pointsApplied: false,
      ranking: { includesTournamentPoints: false },
      categories: [],
      entries: [{ userId: 'p1', categoryId: 'cat-a', finalPosition: 'champion' }],
    });

    const result = await service.apply(tx, 'tour-1');

    expect(result.applied).toBe(0);
    expect(tx.playerRankingEntry.upsert).not.toHaveBeenCalled();
    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: expect.objectContaining({ pointsApplied: true }) as object,
    });
  });

  it('pula entry com finalPosition que nao está no schema (0 pontos)', async () => {
    const tx = makeTx();
    tx.tournament.findUnique.mockResolvedValue({
      id: 'tour-1',
      rankingId: 'rank-1',
      pointsApplied: false,
      ranking: { includesTournamentPoints: true },
      categories: [{ id: 'cat-a', pointsSchema: { points: { champion: 100 } } }],
      entries: [
        { userId: 'p1', categoryId: 'cat-a', finalPosition: 'champion' },
        { userId: 'p2', categoryId: 'cat-a', finalPosition: 'unknown_position' },
      ],
    });

    const result = await service.apply(tx, 'tour-1');

    expect(result.applied).toBe(1);
    expect(tx.playerRankingEntry.upsert).toHaveBeenCalledTimes(1);
  });
});
