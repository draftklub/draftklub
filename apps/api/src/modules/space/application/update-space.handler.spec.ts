import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateSpaceHandler } from './update-space.handler';
import type { SpacePrismaRepository } from '../infrastructure/repositories/space.prisma.repository';

const KLUB_ID = '00000000-0000-0000-0099-000000000001';
const SPACE_ID = '00000000-0000-0000-0001-000000000001';

interface MockSpace {
  id: string;
  klubId: string;
  deletedAt: Date | null;
}

function buildHandler(opts: { space?: MockSpace | null } = {}) {
  const findById = vi.fn(() => Promise.resolve(opts.space === undefined ? null : opts.space));
  const update = vi.fn((id: string, patch: Record<string, unknown>) =>
    Promise.resolve({ id, ...patch }),
  );
  const repo = { findById, update };
  const handler = new UpdateSpaceHandler(repo as unknown as SpacePrismaRepository);
  return { handler, update };
}

describe('UpdateSpaceHandler', () => {
  it('atualiza Space que pertence ao Klub', async () => {
    const { handler, update } = buildHandler({
      space: { id: SPACE_ID, klubId: KLUB_ID, deletedAt: null },
    });
    await handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID, patch: { name: 'Novo nome' } });
    expect(update).toHaveBeenCalledWith(SPACE_ID, { name: 'Novo nome' });
  });

  it('rejeita 404 quando Space não existe', async () => {
    const { handler } = buildHandler({ space: null });
    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID, patch: { name: 'X' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita 404 quando Space soft-deleted', async () => {
    const { handler } = buildHandler({
      space: { id: SPACE_ID, klubId: KLUB_ID, deletedAt: new Date() },
    });
    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID, patch: { name: 'X' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita Forbidden quando Space pertence a outro Klub', async () => {
    const { handler } = buildHandler({
      space: { id: SPACE_ID, klubId: 'OUTRO_KLUB', deletedAt: null },
    });
    await expect(
      handler.execute({ klubId: KLUB_ID, spaceId: SPACE_ID, patch: { name: 'X' } }),
    ).rejects.toThrow(ForbiddenException);
  });
});
