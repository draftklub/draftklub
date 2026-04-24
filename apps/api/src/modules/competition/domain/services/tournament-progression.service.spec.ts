import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TournamentProgressionService } from './tournament-progression.service';

interface TxMock {
  tournamentMatch: {
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  tournamentEntry: { updateMany: ReturnType<typeof vi.fn> };
  tournament: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function makeTx(): TxMock {
  return {
    tournamentMatch: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    tournamentEntry: { updateMany: vi.fn().mockResolvedValue({}) },
    tournament: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('TournamentProgressionService.resolvePrequalifierSlots', () => {
  let service: TournamentProgressionService;

  beforeEach(() => {
    service = new TournamentProgressionService();
  });

  const prequalifierMatch = {
    id: 'preq-1',
    tournamentId: 'tour-1',
    player1Id: 'p1',
    player2Id: 'p2',
    winnerId: 'p1',
  };

  it('transiciona prequalifying → in_progress quando último pré termina', async () => {
    const tx = makeTx();
    tx.tournamentMatch.count.mockResolvedValue(0);
    tx.tournament.findUnique.mockResolvedValue({ status: 'prequalifying' });
    tx.tournamentMatch.findFirst.mockResolvedValue({ phase: 'semifinals' });

    await service.resolvePrequalifierSlots(tx, prequalifierMatch);

    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: { status: 'in_progress', currentPhase: 'semifinals' },
    });
  });

  it('nao transiciona se ainda ha prequalifiers pendentes', async () => {
    const tx = makeTx();
    tx.tournamentMatch.count.mockResolvedValue(2);

    await service.resolvePrequalifierSlots(tx, prequalifierMatch);

    expect(tx.tournament.update).not.toHaveBeenCalled();
  });

  it('nao transiciona se tournament ja nao esta prequalifying', async () => {
    const tx = makeTx();
    tx.tournamentMatch.count.mockResolvedValue(0);
    tx.tournament.findUnique.mockResolvedValue({ status: 'in_progress' });

    await service.resolvePrequalifierSlots(tx, prequalifierMatch);

    expect(tx.tournament.update).not.toHaveBeenCalled();
  });

  it('usa "final" como fallback se nao ha main match (caso degenerado)', async () => {
    const tx = makeTx();
    tx.tournamentMatch.count.mockResolvedValue(0);
    tx.tournament.findUnique.mockResolvedValue({ status: 'prequalifying' });
    tx.tournamentMatch.findFirst.mockResolvedValue(null);

    await service.resolvePrequalifierSlots(tx, prequalifierMatch);

    expect(tx.tournament.update).toHaveBeenCalledWith({
      where: { id: 'tour-1' },
      data: { status: 'in_progress', currentPhase: 'final' },
    });
  });
});

describe('TournamentProgressionService.advance — pending→scheduled transition', () => {
  let service: TournamentProgressionService;

  const advanceCtx = {
    id: 'sf-1',
    tournamentId: 'tour-1',
    phase: 'semifinals',
    player1Id: 'p1',
    player2Id: 'p2',
    nextMatchId: 'final-match',
    nextMatchSlot: 'top',
  };

  beforeEach(() => {
    service = new TournamentProgressionService();
  });

  it('vira scheduled quando nextMatch ja tinha o outro player definido', async () => {
    const tx = makeTx();
    tx.tournamentMatch.findUnique.mockResolvedValueOnce({
      status: 'pending',
      player1Id: 'winner-prev',
      player2Id: 'p1',
    });

    await service.advance(tx, advanceCtx, 'p1');

    expect(tx.tournamentMatch.update).toHaveBeenCalledWith({
      where: { id: 'final-match' },
      data: { status: 'scheduled' },
    });
  });

  it('continua pending se nextMatch so tem um player definido', async () => {
    const tx = makeTx();
    tx.tournamentMatch.findUnique.mockResolvedValueOnce({
      status: 'pending',
      player1Id: 'p1',
      player2Id: null,
    });

    await service.advance(tx, advanceCtx, 'p1');

    const scheduledCalls = tx.tournamentMatch.update.mock.calls.filter(
      ([args]) => (args as { data: { status?: string } }).data.status === 'scheduled',
    );
    expect(scheduledCalls).toHaveLength(0);
  });

  it('nao vira scheduled se status ja eh bye (ou diferente de pending)', async () => {
    const tx = makeTx();
    tx.tournamentMatch.findUnique.mockResolvedValueOnce({
      status: 'bye',
      player1Id: 'p1',
      player2Id: 'p2',
    });

    await service.advance(tx, advanceCtx, 'p1');

    const scheduledCalls = tx.tournamentMatch.update.mock.calls.filter(
      ([args]) => (args as { data: { status?: string } }).data.status === 'scheduled',
    );
    expect(scheduledCalls).toHaveLength(0);
  });
});
