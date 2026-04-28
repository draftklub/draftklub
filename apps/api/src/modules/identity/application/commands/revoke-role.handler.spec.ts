import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RevokeRoleHandler } from './revoke-role.handler';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

const OWNER_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000002';
const KLUB_ID = '00000000-0000-0000-0000-000000000010';
const ASSIGN_ID = '00000000-0000-0000-0000-000000000099';

function ownerCaller(): AuthenticatedUser {
  return {
    userId: OWNER_ID,
    firebaseUid: 'fb',
    email: 'owner@test.com',
    roleAssignments: [{ role: 'PLATFORM_OWNER' }],
  };
}

function assignmentRow(
  overrides: Partial<{
    id: string;
    userId: string;
    role: string;
    scopeKlubId: string | null;
    scopeSportId: string | null;
  }> = {},
) {
  return {
    id: ASSIGN_ID,
    userId: ADMIN_USER_ID,
    role: 'PLATFORM_ADMIN',
    scopeKlubId: null,
    scopeSportId: null,
    ...overrides,
  };
}

function makePrisma(assignment: ReturnType<typeof assignmentRow> | null) {
  return {
    roleAssignment: {
      findUnique: vi.fn().mockResolvedValue(assignment),
      delete: vi.fn().mockResolvedValue({ id: ASSIGN_ID }),
    },
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>): RevokeRoleHandler {
  return new RevokeRoleHandler(prisma as never, new PolicyEngine());
}

describe('RevokeRoleHandler', () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma(assignmentRow());
  });

  it('Owner revoga PLATFORM_ADMIN OK', async () => {
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: ownerCaller(),
      assignmentId: ASSIGN_ID,
      expectedScopeKlubId: null,
    });
    expect(result.id).toBe(ASSIGN_ID);
    expect(prisma.roleAssignment.delete).toHaveBeenCalled();
  });

  it('Assignment não existe → NotFound', async () => {
    prisma = makePrisma(null);
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Scope mismatch → NotFound', async () => {
    prisma = makePrisma(assignmentRow({ scopeKlubId: 'other-klub' }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: KLUB_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Bloqueia revoke de PLATFORM_OWNER (BadRequest)', async () => {
    prisma = makePrisma(assignmentRow({ role: 'PLATFORM_OWNER' }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Bloqueia revoke de KLUB_ADMIN (BadRequest)', async () => {
    prisma = makePrisma(assignmentRow({ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: KLUB_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Self-revoke bloqueado (BadRequest)', async () => {
    prisma = makePrisma(assignmentRow({ userId: OWNER_ID, role: 'PLATFORM_ADMIN' }));
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: ownerCaller(),
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PLATFORM_ADMIN NÃO pode revogar outro PLATFORM_ADMIN (Forbidden)', async () => {
    const adminCaller: AuthenticatedUser = {
      userId: 'admin-1',
      firebaseUid: 'fb',
      email: 'admin1@test.com',
      roleAssignments: [{ role: 'PLATFORM_ADMIN' }],
    };
    const handler = makeHandler(prisma);
    await expect(
      handler.execute({
        caller: adminCaller,
        assignmentId: ASSIGN_ID,
        expectedScopeKlubId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('KLUB_ADMIN revoga KLUB_ASSISTANT do seu Klub OK', async () => {
    prisma = makePrisma(assignmentRow({ role: 'KLUB_ASSISTANT', scopeKlubId: KLUB_ID }));
    const klubAdminCaller: AuthenticatedUser = {
      userId: 'admin-of-klub',
      firebaseUid: 'fb',
      email: 'a@k.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
    };
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: klubAdminCaller,
      assignmentId: ASSIGN_ID,
      expectedScopeKlubId: KLUB_ID,
    });
    expect(result.id).toBe(ASSIGN_ID);
  });
});
