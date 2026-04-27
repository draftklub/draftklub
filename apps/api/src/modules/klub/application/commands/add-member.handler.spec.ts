import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddMemberHandler } from './add-member.handler';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';

interface FakeMembership {
  id: string;
  userId: string;
  klubId: string;
  type: string;
  status: string;
}

interface FakeRoleAssignment {
  id: string;
  userId: string;
  role: string;
  scopeKlubId: string | null;
  scopeSportId: string | null;
}

interface FakeTx {
  membership: {
    findUnique: (args: {
      where: { userId_klubId: { userId: string; klubId: string } };
    }) => Promise<FakeMembership | null>;
    update: (args: {
      where: { id: string };
      data: Partial<FakeMembership>;
    }) => Promise<FakeMembership>;
    create: (args: { data: Omit<FakeMembership, 'id'> }) => Promise<FakeMembership>;
  };
  roleAssignment: {
    findFirst: (args: {
      where: { userId: string; scopeKlubId: string; role: string };
    }) => Promise<FakeRoleAssignment | null>;
    create: (args: { data: Omit<FakeRoleAssignment, 'id'> }) => Promise<FakeRoleAssignment>;
  };
}

function buildPrisma() {
  let memberships: FakeMembership[] = [];
  let roleAssignments: FakeRoleAssignment[] = [];

  const tx: FakeTx = {
    membership: {
      findUnique: vi.fn(
        ({ where }: { where: { userId_klubId: { userId: string; klubId: string } } }) =>
          Promise.resolve(
            memberships.find(
              (m) =>
                m.userId === where.userId_klubId.userId && m.klubId === where.userId_klubId.klubId,
            ) ?? null,
          ),
      ),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Partial<FakeMembership> }) => {
        const idx = memberships.findIndex((m) => m.id === where.id);
        const current = memberships[idx];
        if (!current) throw new Error(`membership ${where.id} not found`);
        const updated = { ...current, ...data };
        memberships[idx] = updated;
        return Promise.resolve(updated);
      }),
      create: vi.fn(({ data }: { data: Omit<FakeMembership, 'id'> }) => {
        const created: FakeMembership = { id: `mem-${memberships.length + 1}`, ...data };
        memberships.push(created);
        return Promise.resolve(created);
      }),
    },
    roleAssignment: {
      findFirst: vi.fn(
        ({ where }: { where: { userId: string; scopeKlubId: string; role: string } }) =>
          Promise.resolve(
            roleAssignments.find(
              (r) =>
                r.userId === where.userId &&
                r.scopeKlubId === where.scopeKlubId &&
                r.role === where.role,
            ) ?? null,
          ),
      ),
      create: vi.fn(({ data }: { data: Omit<FakeRoleAssignment, 'id'> }) => {
        const created: FakeRoleAssignment = { id: `role-${roleAssignments.length + 1}`, ...data };
        roleAssignments.push(created);
        return Promise.resolve(created);
      }),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((fn: (tx: FakeTx) => Promise<unknown>) => fn(tx)),
    },
    state: {
      get memberships() {
        return memberships;
      },
      get roleAssignments() {
        return roleAssignments;
      },
      seed: (m: FakeMembership[], r: FakeRoleAssignment[]) => {
        memberships = m;
        roleAssignments = r;
      },
    },
  };
}

describe('AddMemberHandler', () => {
  let handler: AddMemberHandler;
  let fake: ReturnType<typeof buildPrisma>;

  beforeEach(() => {
    fake = buildPrisma();
    handler = new AddMemberHandler({} as never);
    (handler as unknown as { prisma: unknown }).prisma = fake.prisma;
  });

  it('cria Membership e RoleAssignment(PLAYER) atomicamente quando user nao existe no Klub', async () => {
    await handler.execute({ klubId: KLUB_ID, userId: USER_ID, type: 'member' });

    expect(fake.state.memberships).toHaveLength(1);
    expect(fake.state.memberships[0]).toMatchObject({
      userId: USER_ID,
      klubId: KLUB_ID,
      type: 'member',
      status: 'active',
    });

    expect(fake.state.roleAssignments).toHaveLength(1);
    expect(fake.state.roleAssignments[0]).toMatchObject({
      userId: USER_ID,
      role: 'PLAYER',
      scopeKlubId: KLUB_ID,
      scopeSportId: null,
    });
  });

  it('aceita role custom (ex: STAFF) e cria RoleAssignment correspondente', async () => {
    await handler.execute({ klubId: KLUB_ID, userId: USER_ID, type: 'staff', role: 'STAFF' });

    expect(fake.state.roleAssignments[0]?.role).toBe('STAFF');
  });

  it('idempotente: re-executar nao duplica RoleAssignment', async () => {
    await handler.execute({ klubId: KLUB_ID, userId: USER_ID, type: 'member' });
    await handler.execute({ klubId: KLUB_ID, userId: USER_ID, type: 'member' });

    expect(fake.state.memberships).toHaveLength(1);
    expect(fake.state.roleAssignments).toHaveLength(1);
  });

  it('reativa Membership inativo e garante RoleAssignment', async () => {
    fake.state.seed(
      [
        {
          id: 'mem-existing',
          userId: USER_ID,
          klubId: KLUB_ID,
          type: 'member',
          status: 'inactive',
        },
      ],
      [],
    );

    await handler.execute({ klubId: KLUB_ID, userId: USER_ID, type: 'member' });

    expect(fake.state.memberships[0]?.status).toBe('active');
    expect(fake.state.roleAssignments).toHaveLength(1);
    expect(fake.state.roleAssignments[0]?.role).toBe('PLAYER');
  });
});
