import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GrantRoleHandler } from './grant-role.handler';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

const OWNER_ID = '00000000-0000-0000-0000-000000000001';
const KLUB_ID = '00000000-0000-0000-0000-000000000010';
const TARGET_ID = '00000000-0000-0000-0000-000000000020';
const NEW_ASSIGN_ID = '00000000-0000-0000-0000-000000000099';

function ownerCaller(): AuthenticatedUser {
  return {
    userId: OWNER_ID,
    firebaseUid: 'fb-owner',
    email: 'owner@test.com',
    roleAssignments: [{ role: 'PLATFORM_OWNER' }],
  };
}

function adminCaller(): AuthenticatedUser {
  return {
    userId: 'admin-1',
    firebaseUid: 'fb-admin',
    email: 'admin@test.com',
    roleAssignments: [{ role: 'PLATFORM_ADMIN' }],
  };
}

function makePrisma(
  opts: {
    user?: { id: string } | null;
    platformAdminCount?: number;
    existing?: { id: string } | null;
  } = {},
) {
  const userValue = 'user' in opts ? opts.user : { id: TARGET_ID };
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(userValue),
    },
    roleAssignment: {
      count: vi.fn().mockResolvedValue(opts.platformAdminCount ?? 0),
      findFirst: vi.fn().mockResolvedValue(opts.existing ?? null),
      create: vi.fn().mockResolvedValue({ id: NEW_ASSIGN_ID }),
    },
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>): GrantRoleHandler {
  const auditMock = { record: vi.fn().mockResolvedValue(undefined) } as never;
  const handler = new GrantRoleHandler(prisma as never, new PolicyEngine(), auditMock);
  return handler;
}

describe('GrantRoleHandler', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
  });

  it('Owner concede PLATFORM_ADMIN com sucesso', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: ownerCaller(),
      targetEmail: 'new@test.com',
      targetRole: 'PLATFORM_ADMIN',
      scopeKlubId: null,
      scopeSportId: null,
    });
    expect(result.id).toBe(NEW_ASSIGN_ID);
    expect(prisma.roleAssignment.create).toHaveBeenCalled();
  });

  it('PLATFORM_ADMIN não pode conceder PLATFORM_ADMIN (Forbidden)', async () => {
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: adminCaller(),
        targetEmail: 'new@test.com',
        targetRole: 'PLATFORM_ADMIN',
        scopeKlubId: null,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Bloqueia targetRole PLATFORM_OWNER (BadRequest)', async () => {
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        targetEmail: 'new@test.com',
        targetRole: 'PLATFORM_OWNER',
        scopeKlubId: null,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Bloqueia targetRole KLUB_ADMIN (BadRequest)', async () => {
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        targetEmail: 'new@test.com',
        targetRole: 'KLUB_ADMIN',
        scopeKlubId: KLUB_ID,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Quota PLATFORM_ADMIN: 4º grant retorna Conflict', async () => {
    prisma = makePrisma({ platformAdminCount: 3 });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        targetEmail: 'new@test.com',
        targetRole: 'PLATFORM_ADMIN',
        scopeKlubId: null,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('Email não encontrado → NotFound', async () => {
    prisma = makePrisma({ user: null });
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        targetEmail: 'ghost@test.com',
        targetRole: 'PLATFORM_ADMIN',
        scopeKlubId: null,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Idempotência: existing retorna mesmo id, sem criar', async () => {
    prisma = makePrisma({ existing: { id: 'existing-id' } });
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: ownerCaller(),
      targetEmail: 'dup@test.com',
      targetRole: 'PLATFORM_ADMIN',
      scopeKlubId: null,
      scopeSportId: null,
    });
    expect(result.id).toBe('existing-id');
    expect(prisma.roleAssignment.create).not.toHaveBeenCalled();
  });

  it('KLUB_ADMIN no Klub concede KLUB_ASSISTANT scoped', async () => {
    const klubAdminCaller: AuthenticatedUser = {
      userId: 'admin-of-klub',
      firebaseUid: 'fb',
      email: 'a@k.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
    };
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: klubAdminCaller,
      targetEmail: 'helper@test.com',
      targetRole: 'KLUB_ASSISTANT',
      scopeKlubId: KLUB_ID,
      scopeSportId: null,
    });
    expect(result.id).toBe(NEW_ASSIGN_ID);
  });

  it('KLUB_ASSISTANT NÃO pode conceder KLUB_ADMIN no scope (BadRequest pre-policy)', async () => {
    const assistantCaller: AuthenticatedUser = {
      userId: 'assistant',
      firebaseUid: 'fb',
      email: 'asst@test.com',
      roleAssignments: [{ role: 'KLUB_ASSISTANT', scopeKlubId: KLUB_ID }],
    };
    const handler = makeHandler(prisma);
    // KLUB_ADMIN é blocked pelo BadRequest antes da policy, então é BadRequest
    // (mesmo que o user tivesse permissão também não cairia em ForbiddenException).
    await expect(
      handler.execute({
        caller: assistantCaller,
        targetEmail: 'x@y.com',
        targetRole: 'KLUB_ADMIN',
        scopeKlubId: KLUB_ID,
        scopeSportId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
