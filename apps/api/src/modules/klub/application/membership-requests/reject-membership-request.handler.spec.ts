import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RejectMembershipRequestHandler } from './reject-membership-request.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

function buildHandler(
  req: {
    id: string;
    klubId: string;
    userId: string;
    status: string;
    klub: { name: string };
  } | null,
) {
  const update = vi.fn((_args: { where: { id: string }; data: Record<string, unknown> }) =>
    Promise.resolve({}),
  );
  const outbox = vi.fn((_args: { data: { eventType: string; payload: unknown } }) =>
    Promise.resolve({}),
  );
  const tx = {
    membershipRequest: {
      findUnique: vi.fn(() => Promise.resolve(req)),
      update,
    },
    outboxEvent: { create: outbox },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const handler = new RejectMembershipRequestHandler(
    prisma as unknown as PrismaService,
    { membershipRequestDecided: vi.fn() } as never,
  );
  return { handler, update, outbox };
}

const REQ = {
  id: 'req-1',
  klubId: 'klub-1',
  userId: 'user-1',
  status: 'pending',
  klub: { name: 'Tennis Club' },
};

describe('RejectMembershipRequestHandler', () => {
  it('rejeita motivo curto', async () => {
    const { handler } = buildHandler(REQ);
    await expect(
      handler.execute({
        requestId: 'req-1',
        klubId: 'klub-1',
        decidedById: 'admin-1',
        reason: 'curto',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita motivo longo (>500)', async () => {
    const { handler } = buildHandler(REQ);
    await expect(
      handler.execute({
        requestId: 'req-1',
        klubId: 'klub-1',
        decidedById: 'admin-1',
        reason: 'x'.repeat(501),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('aceita motivo válido e marca rejected', async () => {
    const { handler, update, outbox } = buildHandler(REQ);
    await handler.execute({
      requestId: 'req-1',
      klubId: 'klub-1',
      decidedById: 'admin-1',
      reason: 'Sem comprovação válida',
    });
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.data.status).toBe('rejected');
    expect(updateCall?.data.rejectionReason).toBe('Sem comprovação válida');
    const outboxCall = outbox.mock.calls[0]?.[0];
    expect(outboxCall?.data.eventType).toBe('klub.membership_request.rejected');
  });

  it('rejeita 404 quando request não existe', async () => {
    const { handler } = buildHandler(null);
    await expect(
      handler.execute({
        requestId: 'x',
        klubId: 'klub-1',
        decidedById: 'admin-1',
        reason: 'motivo válido aqui',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita BadRequest quando já decidido', async () => {
    const { handler } = buildHandler({ ...REQ, status: 'rejected' });
    await expect(
      handler.execute({
        requestId: 'req-1',
        klubId: 'klub-1',
        decidedById: 'admin-1',
        reason: 'motivo válido aqui',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
