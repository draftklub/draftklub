import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TournamentProgressionService } from './tournament-progression.service';

interface TxMock {
  tournamentMatch: {
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
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
      updateMany: vi.fn().mockResolvedValue({}),
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

describe('TournamentProgressionService.maybeResolveGroupStandings', () => {
  let service: TournamentProgressionService;

  beforeEach(() => {
    service = new TournamentProgressionService();
  });

  it('nao resolve se algum match do grupo ainda nao terminou', async () => {
    const tx = makeTx();
    tx.tournamentMatch.findMany.mockResolvedValueOnce([
      { id: 'm1', status: 'completed', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', seed1: 1, seed2: 2 },
      { id: 'm2', status: 'scheduled', winnerId: null, player1Id: 'p3', player2Id: 'p4', seed1: 3, seed2: 4 },
    ]);

    await service.maybeResolveGroupStandings(tx, 'tour-1', 'cat-a', 'A');

    expect(tx.tournamentMatch.updateMany).not.toHaveBeenCalled();
  });

  it('resolve standings ordenando por wins e tiebreak por seed quando todos completos', async () => {
    const tx = makeTx();
    tx.tournamentMatch.findMany.mockResolvedValueOnce([
      { id: 'm1', status: 'completed', winnerId: 'p1', player1Id: 'p1', player2Id: 'p2', seed1: 1, seed2: 2 },
      { id: 'm2', status: 'completed', winnerId: 'p3', player1Id: 'p3', player2Id: 'p4', seed1: 3, seed2: 4 },
      { id: 'm3', status: 'completed', winnerId: 'p1', player1Id: 'p1', player2Id: 'p3', seed1: 1, seed2: 3 },
      { id: 'm4', status: 'completed', winnerId: 'p2', player1Id: 'p2', player2Id: 'p4', seed1: 2, seed2: 4 },
      { id: 'm5', status: 'completed', winnerId: 'p1', player1Id: 'p1', player2Id: 'p4', seed1: 1, seed2: 4 },
      { id: 'm6', status: 'completed', winnerId: 'p3', player1Id: 'p2', player2Id: 'p3', seed1: 2, seed2: 3 },
    ]);
    // Pre-resolve filling: empty list of pending main matches
    tx.tournamentMatch.findMany.mockResolvedValueOnce([]);

    await service.maybeResolveGroupStandings(tx, 'tour-1', 'cat-a', 'A');

    // p1 has 3 wins, p3 has 2, p2 has 1, p4 has 0
    // Expect updateMany called for each position
    const updateManyCalls = tx.tournamentMatch.updateMany.mock.calls;
    const labelCalls = updateManyCalls
      .map(([args]) => (args as { where?: { tbdPlayer1Label?: string; tbdPlayer2Label?: string } }).where ?? {})
      .filter((w) => w.tbdPlayer1Label != null || w.tbdPlayer2Label != null);

    expect(labelCalls.length).toBeGreaterThanOrEqual(4);
    // Has updates for "1º Grupo A", "2º Grupo A", etc.
    const labels = labelCalls.map((w) => w.tbdPlayer1Label ?? w.tbdPlayer2Label);
    expect(labels).toContain('1º Grupo A');
    expect(labels).toContain('2º Grupo A');
    expect(labels).toContain('3º Grupo A');
    expect(labels).toContain('4º Grupo A');
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
