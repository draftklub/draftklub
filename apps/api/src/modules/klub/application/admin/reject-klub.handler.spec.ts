import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RejectKlubHandler } from './reject-klub.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

function buildHandler(
  klub: {
    id: string;
    name: string;
    reviewStatus: string;
    deletedAt: Date | null;
    createdById: string | null;
  } | null,
) {
  const update = vi.fn((_args: { where: { id: string }; data: Record<string, unknown> }) =>
    Promise.resolve({}),
  );
  const outbox = vi.fn((_args: { data: { eventType: string; payload: unknown } }) =>
    Promise.resolve({}),
  );
  const tx = {
    klub: {
      findUnique: vi.fn(() => Promise.resolve(klub)),
      update,
    },
    outboxEvent: { create: outbox },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const handler = new RejectKlubHandler(prisma as unknown as PrismaService);
  return { handler, update, outbox };
}

const KLUB_ID = '00000000-0000-0000-0099-000000000001';
const ADMIN_ID = '00000000-0000-0000-0001-aaaaaaaaaaaa';

describe('RejectKlubHandler', () => {
  it('rejeita motivo curto (< 10 chars)', async () => {
    const { handler } = buildHandler({
      id: KLUB_ID,
      name: 'X',
      reviewStatus: 'pending',
      deletedAt: null,
      createdById: 'c',
    });
    await expect(
      handler.execute({ klubId: KLUB_ID, decidedById: ADMIN_ID, reason: 'curto' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita motivo longo (> 500 chars)', async () => {
    const { handler } = buildHandler({
      id: KLUB_ID,
      name: 'X',
      reviewStatus: 'pending',
      deletedAt: null,
      createdById: 'c',
    });
    await expect(
      handler.execute({
        klubId: KLUB_ID,
        decidedById: ADMIN_ID,
        reason: 'x'.repeat(501),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('aceita motivo válido e marca rejected', async () => {
    const { handler, update, outbox } = buildHandler({
      id: KLUB_ID,
      name: 'X',
      reviewStatus: 'pending',
      deletedAt: null,
      createdById: 'c',
    });
    await handler.execute({
      klubId: KLUB_ID,
      decidedById: ADMIN_ID,
      reason: 'CNPJ inválido na Receita Federal',
    });
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.data.reviewStatus).toBe('rejected');
    expect(updateCall?.data.reviewRejectionReason).toBe('CNPJ inválido na Receita Federal');
    const outboxCall = outbox.mock.calls[0]?.[0];
    expect(outboxCall?.data.eventType).toBe('klub.review.rejected');
  });

  it('rejeita 404 quando Klub não existe', async () => {
    const { handler } = buildHandler(null);
    await expect(
      handler.execute({
        klubId: KLUB_ID,
        decidedById: ADMIN_ID,
        reason: 'motivo válido aqui',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita BadRequest quando já decidido', async () => {
    const { handler } = buildHandler({
      id: KLUB_ID,
      name: 'X',
      reviewStatus: 'rejected',
      deletedAt: null,
      createdById: 'c',
    });
    await expect(
      handler.execute({
        klubId: KLUB_ID,
        decidedById: ADMIN_ID,
        reason: 'motivo válido aqui',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
