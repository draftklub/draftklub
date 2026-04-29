import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ApproveKlubHandler } from './approve-klub.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlub {
  id: string;
  slug: string;
  name: string;
  reviewStatus: string;
  deletedAt: Date | null;
  createdById: string | null;
}

function buildHandler(opts: { klub?: MockKlub | null; conflict?: { name: string } | null } = {}) {
  const klubUpdate = vi.fn((args: { where: { id: string }; data: Record<string, unknown> }) =>
    Promise.resolve({ id: args.where.id, slug: opts.klub?.slug ?? 'test' }),
  );
  const outboxCreate = vi.fn((_args: { data: { eventType: string; payload: unknown } }) =>
    Promise.resolve({}),
  );
  const tx = {
    klub: {
      findUnique: vi.fn(() => Promise.resolve(opts.klub === undefined ? null : opts.klub)),
      findFirst: vi.fn(() => Promise.resolve(opts.conflict ?? null)),
      update: klubUpdate,
    },
    outboxEvent: {
      create: outboxCreate,
    },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const handler = new ApproveKlubHandler(
    prisma as unknown as PrismaService,
    { record: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { handler, tx, klubUpdate, outboxCreate };
}

const KLUB_ID = '00000000-0000-0000-0099-000000000001';
const ADMIN_ID = '00000000-0000-0000-0001-aaaaaaaaaaaa';

describe('ApproveKlubHandler', () => {
  it('aprova Klub pending sem conflitos', async () => {
    const { handler, klubUpdate, outboxCreate } = buildHandler({
      klub: {
        id: KLUB_ID,
        slug: 'tennis-club-botafogo',
        name: 'Tennis Club',
        reviewStatus: 'pending',
        deletedAt: null,
        createdById: 'creator-1',
      },
    });
    await handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID });
    const updateCall = klubUpdate.mock.calls[0]?.[0];
    expect(updateCall?.data.reviewStatus).toBe('approved');
    expect(updateCall?.data.reviewDecidedById).toBe(ADMIN_ID);
    const outboxCall = outboxCreate.mock.calls[0]?.[0];
    expect(outboxCall?.data.eventType).toBe('klub.review.approved');
  });

  it('rejeita 404 quando Klub não existe', async () => {
    const { handler } = buildHandler({ klub: null });
    await expect(handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejeita BadRequest quando já decidido', async () => {
    const { handler } = buildHandler({
      klub: {
        id: KLUB_ID,
        slug: 'foo',
        name: 'Foo',
        reviewStatus: 'approved',
        deletedAt: null,
        createdById: 'c',
      },
    });
    await expect(handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita Conflict quando slug em uso por Klub aprovado', async () => {
    const { handler } = buildHandler({
      klub: {
        id: KLUB_ID,
        slug: 'duplicado',
        name: 'Klub',
        reviewStatus: 'pending',
        deletedAt: null,
        createdById: 'c',
      },
      conflict: { name: 'Klub Outro' },
    });
    await expect(handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID })).rejects.toThrow(
      ConflictException,
    );
  });
});
