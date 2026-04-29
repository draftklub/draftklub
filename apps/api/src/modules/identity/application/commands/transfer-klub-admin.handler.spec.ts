import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransferKlubAdminHandler } from './transfer-klub-admin.handler';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

const KLUB_ID = '00000000-0000-0000-0000-000000000010';
const OLD_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_ID = '00000000-0000-0000-0000-000000000002';
const ADMIN_ASSIGN_ID = '00000000-0000-0000-0000-000000000099';

function klubAdminCaller(): AuthenticatedUser {
  return {
    userId: OLD_ADMIN_ID,
    firebaseUid: 'fb-old',
    email: 'old@admin.com',
    roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
  };
}

function platformOwnerCaller(): AuthenticatedUser {
  return {
    userId: 'owner-id',
    firebaseUid: 'fb-owner',
    email: 'owner@platform.com',
    roleAssignments: [{ role: 'PLATFORM_OWNER' }],
  };
}

interface PrismaOpts {
  target?: { id: string } | null;
  currentAdmin?: { id: string; userId: string } | null;
  membership?: { status: string } | null;
  klub?: { name: string; slug: string } | null;
}

function makePrisma(opts: PrismaOpts = {}) {
  const targetValue = 'target' in opts ? opts.target : { id: TARGET_ID };
  const adminValue =
    'currentAdmin' in opts ? opts.currentAdmin : { id: ADMIN_ASSIGN_ID, userId: OLD_ADMIN_ID };
  const membershipValue = 'membership' in opts ? opts.membership : { status: 'active' };
  const klubValue = 'klub' in opts ? opts.klub : { name: 'Klub Test', slug: 'klub-test' };

  const tx = {
    roleAssignment: {
      findFirst: vi.fn().mockResolvedValue(adminValue),
      delete: vi.fn().mockResolvedValue({ id: ADMIN_ASSIGN_ID }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'new-admin-row' }),
    },
    membership: {
      findUnique: vi.fn().mockResolvedValue(membershipValue),
    },
    klub: {
      findUnique: vi.fn().mockResolvedValue(klubValue),
    },
    outboxEvent: {
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
    },
  };

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(targetValue),
    },
    $transaction: vi.fn().mockImplementation((cb: (txArg: unknown) => unknown) => cb(tx)),
    _tx: tx,
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>): TransferKlubAdminHandler {
  const auditMock = { record: vi.fn().mockResolvedValue(undefined) } as never;
  return new TransferKlubAdminHandler(prisma as never, new PolicyEngine(), auditMock);
}

describe('TransferKlubAdminHandler', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('KLUB_ADMIN transfere com sucesso (old sai limpo, novo assume)', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: klubAdminCaller(),
      klubId: KLUB_ID,
      targetEmail: 'new@admin.com',
    });
    expect(result).toEqual({
      klubId: KLUB_ID,
      oldAdminUserId: OLD_ADMIN_ID,
      newAdminUserId: TARGET_ID,
    });
    expect(prisma._tx.roleAssignment.delete).toHaveBeenCalledWith({
      where: { id: ADMIN_ASSIGN_ID },
    });
    expect(prisma._tx.roleAssignment.create).toHaveBeenCalled();
    expect(prisma._tx.outboxEvent.create).toHaveBeenCalled();
  });

  it('Old admin NÃO vira KLUB_ASSISTANT (sai limpo)', async () => {
    const handler = makeHandler(prisma);
    await handler.execute({
      caller: klubAdminCaller(),
      klubId: KLUB_ID,
      targetEmail: 'new@admin.com',
    });
    // Só create de KLUB_ADMIN do target — nenhum create pra old admin
    const createCalls = prisma._tx.roleAssignment.create.mock.calls;
    expect(createCalls).toHaveLength(1);
    const data = (createCalls[0]?.[0] as { data: { userId: string; role: string } }).data;
    expect(data.userId).toBe(TARGET_ID);
    expect(data.role).toBe('KLUB_ADMIN');
  });

  it('Defensive cleanup: deleta KLUB_ASSISTANT/SPORT_* prévios do target', async () => {
    const handler = makeHandler(prisma);
    await handler.execute({
      caller: klubAdminCaller(),
      klubId: KLUB_ID,
      targetEmail: 'new@admin.com',
    });
    const cleanupCall = prisma._tx.roleAssignment.deleteMany.mock.calls[0]?.[0] as {
      where: { userId: string; scopeKlubId: string; role: { in: string[] } };
    };
    expect(cleanupCall.where.userId).toBe(TARGET_ID);
    expect(cleanupCall.where.scopeKlubId).toBe(KLUB_ID);
    expect(cleanupCall.where.role.in).toEqual([
      'KLUB_ASSISTANT',
      'SPORT_COMMISSION',
      'SPORT_STAFF',
    ]);
  });

  it('PLATFORM_OWNER pode forçar transferência', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: platformOwnerCaller(),
      klubId: KLUB_ID,
      targetEmail: 'new@admin.com',
    });
    expect(result.newAdminUserId).toBe(TARGET_ID);
  });

  it('KLUB_ASSISTANT NÃO pode transferir (Forbidden)', async () => {
    const handler = makeHandler(prisma);
    const assistantCaller: AuthenticatedUser = {
      userId: 'asst-id',
      firebaseUid: 'fb',
      email: 'asst@test.com',
      roleAssignments: [{ role: 'KLUB_ASSISTANT', scopeKlubId: KLUB_ID }],
    };
    await expect(
      handler.execute({
        caller: assistantCaller,
        klubId: KLUB_ID,
        targetEmail: 'new@admin.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('KLUB_ADMIN de outro Klub NÃO pode transferir esse', async () => {
    const handler = makeHandler(prisma);
    const otherKlubAdmin: AuthenticatedUser = {
      userId: 'other-admin',
      firebaseUid: 'fb',
      email: 'other@admin.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: 'other-klub-id' }],
    };
    await expect(
      handler.execute({
        caller: otherKlubAdmin,
        klubId: KLUB_ID,
        targetEmail: 'new@admin.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Email não encontrado → NotFound', async () => {
    prisma = makePrisma({ target: null });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: klubAdminCaller(),
        klubId: KLUB_ID,
        targetEmail: 'ghost@nowhere.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Target não é membro ativo → BadRequest', async () => {
    prisma = makePrisma({ membership: null });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: klubAdminCaller(),
        klubId: KLUB_ID,
        targetEmail: 'stranger@test.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Target com membership inativa → BadRequest', async () => {
    prisma = makePrisma({ membership: { status: 'suspended' } });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: klubAdminCaller(),
        klubId: KLUB_ID,
        targetEmail: 'stranger@test.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Target == admin atual → BadRequest (no-op)', async () => {
    // current admin = OLD_ADMIN_ID; target user lookup retorna OLD_ADMIN_ID
    prisma = makePrisma({ target: { id: OLD_ADMIN_ID } });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: klubAdminCaller(),
        klubId: KLUB_ID,
        targetEmail: 'old@admin.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Klub sem KLUB_ADMIN ativo → NotFound (estado inconsistente)', async () => {
    prisma = makePrisma({ currentAdmin: null });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: platformOwnerCaller(),
        klubId: KLUB_ID,
        targetEmail: 'new@admin.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
