import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSpaceHandler } from './create-space.handler';
import type { PrismaService } from '../../../shared/prisma/prisma.service';
import type { SpacePrismaRepository } from '../infrastructure/repositories/space.prisma.repository';

const KLUB_ID = '00000000-0000-0000-0099-000000000001';

interface MockKlub {
  id: string;
  review: { reviewStatus: string } | null;
  deletedAt: Date | null;
}

function buildHandler(opts: { klub?: MockKlub | null } = {}) {
  const findUnique = vi.fn(() => Promise.resolve(opts.klub === undefined ? null : opts.klub));
  const create = vi.fn((data: Record<string, unknown>) =>
    Promise.resolve({ id: 'new-space-id', ...data }),
  );
  const prisma = { klub: { findUnique } };
  const repo = { create };
  const handler = new CreateSpaceHandler(
    prisma as unknown as PrismaService,
    repo as unknown as SpacePrismaRepository,
  );
  return { handler, create, findUnique };
}

const VALID_DATA = {
  klubId: KLUB_ID,
  name: 'Quadra 1',
  type: 'court',
  indoor: false,
  hasLighting: false,
  maxPlayers: 4,
  slotGranularityMinutes: 30,
  slotDefaultDurationMinutes: 60,
  hourBands: [],
  allowedMatchTypes: ['singles', 'doubles'],
};

describe('CreateSpaceHandler', () => {
  it('cria Space quando Klub aprovado', async () => {
    const { handler, create } = buildHandler({
      klub: { id: KLUB_ID, review: { reviewStatus: 'approved' }, deletedAt: null },
    });
    const result = await handler.execute(VALID_DATA);
    expect(result).toMatchObject({ id: 'new-space-id', name: 'Quadra 1' });
    expect(create).toHaveBeenCalled();
  });

  it('rejeita 404 quando Klub não existe', async () => {
    const { handler } = buildHandler({ klub: null });
    await expect(handler.execute(VALID_DATA)).rejects.toThrow(NotFoundException);
  });

  it('rejeita 404 quando Klub soft-deleted', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, reviewStatus: 'approved', deletedAt: new Date() },
    });
    await expect(handler.execute(VALID_DATA)).rejects.toThrow(NotFoundException);
  });

  it('rejeita BadRequest quando Klub não aprovado (pending review)', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, review: { reviewStatus: 'pending' }, deletedAt: null },
    });
    await expect(handler.execute(VALID_DATA)).rejects.toThrow(BadRequestException);
  });

  it('rejeita BadRequest quando Klub rejeitado', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, review: { reviewStatus: 'rejected' }, deletedAt: null },
    });
    await expect(handler.execute(VALID_DATA)).rejects.toThrow(BadRequestException);
  });
});
