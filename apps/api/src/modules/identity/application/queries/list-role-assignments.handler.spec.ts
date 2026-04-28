import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ListRoleAssignmentsHandler } from './list-role-assignments.handler';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

const KLUB_ID = '00000000-0000-0000-0000-000000000010';

function makePrisma(rows: unknown[]) {
  return {
    roleAssignment: {
      findMany: vi.fn().mockResolvedValue(rows),
    },
  };
}

function makeHandler(prisma: ReturnType<typeof makePrisma>): ListRoleAssignmentsHandler {
  return new ListRoleAssignmentsHandler(prisma as never, new PolicyEngine());
}

describe('ListRoleAssignmentsHandler', () => {
  it('Owner lista platform-level OK', async () => {
    const prisma = makePrisma([
      {
        id: 'a1',
        userId: 'u1',
        role: 'PLATFORM_ADMIN',
        scopeKlubId: null,
        scopeSportId: null,
        grantedAt: new Date('2026-01-01T00:00:00Z'),
        grantedBy: 'owner',
        user: { email: 'admin@test.com', fullName: 'Admin User' },
      },
    ]);
    const handler = makeHandler(prisma);
    const result = await handler.execute({
      caller: {
        userId: 'owner',
        firebaseUid: 'fb',
        email: 'owner@test.com',
        roleAssignments: [{ role: 'PLATFORM_OWNER' }],
      },
      scopeKlubId: null,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.userEmail).toBe('admin@test.com');
    expect(result[0]?.role).toBe('PLATFORM_ADMIN');
    const call = prisma.roleAssignment.findMany.mock.calls[0]?.[0] as {
      where: { scopeKlubId: null; role: { not: string } };
    };
    expect(call.where.scopeKlubId).toBeNull();
    expect(call.where.role).toEqual({ not: 'PLAYER' });
  });

  it('PLAYER NÃO pode listar (Forbidden)', async () => {
    const prisma = makePrisma([]);
    const handler = makeHandler(prisma);
    const player: AuthenticatedUser = {
      userId: 'p',
      firebaseUid: 'fb',
      email: 'p@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: KLUB_ID }],
    };
    await expect(
      handler.execute({ caller: player, scopeKlubId: KLUB_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('KLUB_ADMIN lista assignments do próprio Klub', async () => {
    const prisma = makePrisma([]);
    const handler = makeHandler(prisma);
    const klubAdmin: AuthenticatedUser = {
      userId: 'a',
      firebaseUid: 'fb',
      email: 'a@k.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
    };
    await expect(
      handler.execute({ caller: klubAdmin, scopeKlubId: KLUB_ID }),
    ).resolves.toEqual([]);
  });

  it('KLUB_ADMIN NÃO pode listar platform-level (Forbidden)', async () => {
    const prisma = makePrisma([]);
    const handler = makeHandler(prisma);
    const klubAdmin: AuthenticatedUser = {
      userId: 'a',
      firebaseUid: 'fb',
      email: 'a@k.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
    };
    await expect(
      handler.execute({ caller: klubAdmin, scopeKlubId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
