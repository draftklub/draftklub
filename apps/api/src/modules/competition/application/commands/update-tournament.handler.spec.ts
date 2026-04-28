import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateTournamentHandler } from './update-tournament.handler';

const TOURNAMENT_ID = '00000000-0000-0000-0000-000000000010';

function baseTournament(overrides: Record<string, unknown> = {}) {
  return {
    id: TOURNAMENT_ID,
    status: 'draft',
    hasPrequalifiers: false,
    registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
    registrationClosesAt: new Date('2026-01-15T00:00:00Z'),
    drawDate: new Date('2026-01-20T00:00:00Z'),
    prequalifierStartDate: null,
    prequalifierEndDate: null,
    mainStartDate: new Date('2026-02-01T00:00:00Z'),
    mainEndDate: new Date('2026-02-15T00:00:00Z'),
    ...overrides,
  };
}

function makePrisma(tournament: ReturnType<typeof baseTournament> | null) {
  return {
    tournament: {
      findUnique: vi.fn().mockResolvedValue(tournament),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: TOURNAMENT_ID, ...data }),
        ),
    },
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>): UpdateTournamentHandler {
  return new UpdateTournamentHandler(prisma as never);
}

describe('UpdateTournamentHandler', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma(baseTournament());
  });

  it('atualiza nome OK', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      tournamentId: TOURNAMENT_ID,
      updatedById: 'user-1',
      patch: { name: 'Novo nome' },
    });
    expect(result.id).toBe(TOURNAMENT_ID);
    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: TOURNAMENT_ID },
      data: { name: 'Novo nome' },
      select: { id: true },
    });
  });

  it('Tournament inexistente → NotFound', async () => {
    prisma = makePrisma(null);
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        tournamentId: TOURNAMENT_ID,
        updatedById: 'user-1',
        patch: { name: 'X' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Tournament cancelado → BadRequest', async () => {
    prisma = makePrisma(baseTournament({ status: 'cancelled' }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        tournamentId: TOURNAMENT_ID,
        updatedById: 'user-1',
        patch: { name: 'X' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Tournament finalizado → BadRequest', async () => {
    prisma = makePrisma(baseTournament({ status: 'finished' }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        tournamentId: TOURNAMENT_ID,
        updatedById: 'user-1',
        patch: { description: 'X' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Datas fora de ordem → BadRequest', async () => {
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        tournamentId: TOURNAMENT_ID,
        updatedById: 'user-1',
        patch: {
          // mainStart depois de mainEnd existente
          mainStartDate: new Date('2026-03-01T00:00:00Z'),
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Atualiza datas válidas em conjunto', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      tournamentId: TOURNAMENT_ID,
      updatedById: 'user-1',
      patch: {
        registrationOpensAt: new Date('2026-01-05T00:00:00Z'),
        registrationClosesAt: new Date('2026-01-18T00:00:00Z'),
      },
    });
    expect(result.id).toBe(TOURNAMENT_ID);
    const data = prisma.tournament.update.mock.calls[0]?.[0] as { data: Record<string, Date> };
    expect(data.data.registrationOpensAt).toEqual(new Date('2026-01-05T00:00:00Z'));
    expect(data.data.registrationClosesAt).toEqual(new Date('2026-01-18T00:00:00Z'));
  });

  it('hasPrequalifiers=true exige datas de prequalifier', async () => {
    prisma = makePrisma(
      baseTournament({
        hasPrequalifiers: true,
        prequalifierStartDate: null,
        prequalifierEndDate: null,
      }),
    );
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        tournamentId: TOURNAMENT_ID,
        updatedById: 'user-1',
        patch: { name: 'X' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
