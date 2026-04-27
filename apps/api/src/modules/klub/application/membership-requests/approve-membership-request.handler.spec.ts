import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApproveMembershipRequestHandler } from './approve-membership-request.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockReq {
  id: string;
  klubId: string;
  userId: string;
  status: string;
  klub: { name: string; slug: string };
}

function buildHandler(opts: { req?: MockReq | null; existingRole?: { id: string } | null } = {}) {
  const reqFind = vi.fn(() =>
    Promise.resolve(opts.req === undefined ? null : opts.req),
  );
  const reqUpdate = vi.fn(
    (_args: { where: { id: string }; data: Record<string, unknown> }) => Promise.resolve({}),
  );
  const membershipUpsert = vi.fn(() => Promise.resolve({}));
  const roleFind = vi.fn(() => Promise.resolve(opts.existingRole ?? null));
  const roleCreate = vi.fn(() => Promise.resolve({}));
  const outboxCreate = vi.fn(
    (_args: { data: { eventType: string; payload: unknown } }) => Promise.resolve({}),
  );
  const tx = {
    membershipRequest: { findUnique: reqFind, update: reqUpdate },
    membership: { upsert: membershipUpsert },
    roleAssignment: { findFirst: roleFind, create: roleCreate },
    outboxEvent: { create: outboxCreate },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const handler = new ApproveMembershipRequestHandler(prisma as unknown as PrismaService);
  return { handler, reqUpdate, membershipUpsert, roleCreate, outboxCreate };
}

const REQ: MockReq = {
  id: 'req-1',
  klubId: 'klub-1',
  userId: 'user-1',
  status: 'pending',
  klub: { name: 'Tennis Club', slug: 'tennis-club' },
};

describe('ApproveMembershipRequestHandler', () => {
  it('aprova: marca approved, cria membership + role + outbox', async () => {
    const { handler, reqUpdate, membershipUpsert, roleCreate, outboxCreate } = buildHandler({
      req: REQ,
    });
    await handler.execute({ requestId: 'req-1', klubId: 'klub-1', decidedById: 'admin-1' });
    const updateCall = reqUpdate.mock.calls[0]?.[0];
    expect(updateCall?.data.status).toBe('approved');
    expect(membershipUpsert).toHaveBeenCalled();
    expect(roleCreate).toHaveBeenCalled();
    const outboxCall = outboxCreate.mock.calls[0]?.[0];
    expect(outboxCall?.data.eventType).toBe('klub.membership_request.approved');
  });

  it('não cria role duplicada quando já existe', async () => {
    const { handler, roleCreate } = buildHandler({
      req: REQ,
      existingRole: { id: 'role-1' },
    });
    await handler.execute({ requestId: 'req-1', klubId: 'klub-1', decidedById: 'admin-1' });
    expect(roleCreate).not.toHaveBeenCalled();
  });

  it('rejeita 404 quando request não existe', async () => {
    const { handler } = buildHandler({ req: null });
    await expect(
      handler.execute({ requestId: 'req-1', klubId: 'klub-1', decidedById: 'admin-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita 404 quando klubId do route não bate com request.klubId', async () => {
    const { handler } = buildHandler({ req: REQ });
    await expect(
      handler.execute({ requestId: 'req-1', klubId: 'klub-OUTRO', decidedById: 'admin-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita BadRequest quando já decidido', async () => {
    const { handler } = buildHandler({
      req: { ...REQ, status: 'approved' },
    });
    await expect(
      handler.execute({ requestId: 'req-1', klubId: 'klub-1', decidedById: 'admin-1' }),
    ).rejects.toThrow(BadRequestException);
  });
});
