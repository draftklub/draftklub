import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ApproveKlubHandler } from './approve-klub.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlub {
  id: string;
  slug: string;
  name: string;
  review: { reviewStatus: string } | null;
  deletedAt: Date | null;
  createdById: string | null;
}

function buildHandler(opts: { klub?: MockKlub | null; conflict?: { name: string } | null } = {}) {
  const klubReviewUpsert = vi.fn(
    (_args: {
      where: { klubId: string };
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => Promise.resolve({}),
  );
  const outboxCreate = vi.fn((_args: { data: { eventType: string; payload: unknown } }) =>
    Promise.resolve({}),
  );
  const tx = {
    klub: {
      findUnique: vi.fn(() => Promise.resolve(opts.klub === undefined ? null : opts.klub)),
      findFirst: vi.fn(() => Promise.resolve(opts.conflict ?? null)),
    },
    klubReview: {
      upsert: klubReviewUpsert,
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
    { klubReviewDecided: vi.fn() } as never,
  );
  return { handler, tx, klubReviewUpsert, outboxCreate };
}

const KLUB_ID = '00000000-0000-0000-0099-000000000001';
const ADMIN_ID = '00000000-0000-0000-0001-aaaaaaaaaaaa';

describe('ApproveKlubHandler', () => {
  it('aprova Klub pending sem conflitos', async () => {
    const { handler, klubReviewUpsert, outboxCreate } = buildHandler({
      klub: {
        id: KLUB_ID,
        slug: 'tennis-club-botafogo',
        name: 'Tennis Club',
        review: { reviewStatus: 'pending' },
        deletedAt: null,
        createdById: 'creator-1',
      },
    });
    await handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID });
    const upsertCall = klubReviewUpsert.mock.calls[0]?.[0];
    expect(upsertCall?.update.reviewStatus).toBe('approved');
    expect(upsertCall?.update.reviewDecidedById).toBe(ADMIN_ID);
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
        review: { reviewStatus: 'approved' },
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
        review: { reviewStatus: 'pending' },
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
