import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdatePendingKlubHandler } from './update-pending-klub.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

function buildHandler(
  opts: {
    klub?: {
      id: string;
      slug: string;
      review: { reviewStatus: string } | null;
      deletedAt: Date | null;
    } | null;
    slugConflict?: { id: string; name: string } | null;
  } = {},
) {
  const update = vi.fn(
    ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
      Promise.resolve({
        id: where.id,
        slug: (data.slug as string) ?? opts.klub?.slug ?? 'x',
      }),
  );
  const prisma = {
    klub: {
      findUnique: vi.fn(() => Promise.resolve(opts.klub === undefined ? null : opts.klub)),
      findFirst: vi.fn(() => Promise.resolve(opts.slugConflict ?? null)),
      update,
    },
  };
  const handler = new UpdatePendingKlubHandler(prisma as unknown as PrismaService);
  return { handler, update };
}

const KLUB_ID = '00000000-0000-0000-0099-000000000001';

describe('UpdatePendingKlubHandler', () => {
  it('atualiza name e slug quando válido e livre', async () => {
    const { handler, update } = buildHandler({
      klub: {
        id: KLUB_ID,
        slug: 'velho-slug',
        review: { reviewStatus: 'pending' },
        deletedAt: null,
      },
    });
    await handler.execute({
      klubId: KLUB_ID,
      patch: { name: 'Novo Nome', slug: 'novo-slug' },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: KLUB_ID },
      data: { name: 'Novo Nome', slug: 'novo-slug' },
      select: { id: true, slug: true },
    });
  });

  it('rejeita slug com formato inválido', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, slug: 'velho', review: { reviewStatus: 'pending' }, deletedAt: null },
    });
    await expect(
      handler.execute({ klubId: KLUB_ID, patch: { slug: 'NOT VALID' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita Conflict quando slug em uso', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, slug: 'velho', review: { reviewStatus: 'pending' }, deletedAt: null },
      slugConflict: { id: 'other', name: 'Klub Outro' },
    });
    await expect(handler.execute({ klubId: KLUB_ID, patch: { slug: 'taken' } })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejeita BadRequest quando Klub não está pending', async () => {
    const { handler } = buildHandler({
      klub: { id: KLUB_ID, slug: 'x', review: { reviewStatus: 'approved' }, deletedAt: null },
    });
    await expect(handler.execute({ klubId: KLUB_ID, patch: { name: 'Novo' } })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita 404 quando Klub não existe', async () => {
    const { handler } = buildHandler({ klub: null });
    await expect(handler.execute({ klubId: KLUB_ID, patch: { name: 'Novo' } })).rejects.toThrow(
      NotFoundException,
    );
  });
});
