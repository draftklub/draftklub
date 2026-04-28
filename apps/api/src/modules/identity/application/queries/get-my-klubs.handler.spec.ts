import { describe, it, expect, vi } from 'vitest';
import { GetMyKlubsHandler } from './get-my-klubs.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

const USER_ID = '00000000-0000-0000-0001-000000000aaa';
const KLUB_A = '00000000-0000-0000-0099-00000000000a';
const KLUB_B = '00000000-0000-0000-0099-00000000000b';
const KLUB_C = '00000000-0000-0000-0099-00000000000c';

interface MembershipRow {
  klubId: string;
  type: string;
  status: string;
  joinedAt: Date;
  klub: {
    id: string;
    slug: string;
    name: string;
    commonName?: string | null;
    plan: string;
    status: string;
    deletedAt: Date | null;
    reviewStatus?: string;
    reviewRejectionReason?: string | null;
    sportProfiles?: { sportCode: string }[];
  };
}

interface RoleRow {
  role: string;
  scopeKlubId: string | null;
}

function buildHandler(
  opts: {
    memberships?: MembershipRow[];
    roles?: RoleRow[];
  } = {},
) {
  const prisma = {
    membership: {
      findMany: vi.fn(() => Promise.resolve(opts.memberships ?? [])),
    },
    roleAssignment: {
      findMany: vi.fn(() => Promise.resolve(opts.roles ?? [])),
    },
  };

  const handler = new GetMyKlubsHandler(prisma as unknown as PrismaService);
  return { handler, prisma };
}

function membership(klubId: string, overrides: Partial<MembershipRow> = {}): MembershipRow {
  return {
    klubId,
    type: 'member',
    status: 'active',
    joinedAt: new Date('2026-01-01T00:00:00Z'),
    klub: {
      id: klubId,
      slug: `klub-${klubId.slice(-3)}`,
      name: `Klub ${klubId.slice(-3)}`,
      commonName: null,
      plan: 'trial',
      status: 'active',
      deletedAt: null,
      reviewStatus: 'approved',
      reviewRejectionReason: null,
      sportProfiles: [],
    },
    ...overrides,
  };
}

describe('GetMyKlubsHandler', () => {
  it('retorna array vazio quando user nao tem nenhuma membership', async () => {
    const { handler } = buildHandler({ memberships: [] });

    const result = await handler.execute(USER_ID);

    expect(result).toEqual([]);
  });

  it('retorna 1 item com role mapeada quando user tem 1 membership + role', async () => {
    const { handler } = buildHandler({
      memberships: [membership(KLUB_A)],
      roles: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_A }],
    });

    const result = await handler.execute(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      klubId: KLUB_A,
      klubSlug: 'klub-00a',
      role: 'KLUB_ADMIN',
      membershipType: 'member',
      membershipStatus: 'active',
    });
    expect(result[0]?.joinedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('filtra Klubs soft-deleted (deletedAt != null)', async () => {
    const { handler } = buildHandler({
      memberships: [
        membership(KLUB_A),
        membership(KLUB_B, {
          klub: {
            id: KLUB_B,
            slug: 'klub-deleted',
            name: 'Klub Deleted',
            commonName: null,
            plan: 'trial',
            status: 'active',
            deletedAt: new Date('2026-02-01T00:00:00Z'),
            reviewStatus: 'approved',
            reviewRejectionReason: null,
            sportProfiles: [],
          },
        }),
      ],
      roles: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_A }],
    });

    const result = await handler.execute(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.klubId).toBe(KLUB_A);
  });

  it('escolhe a role de maior prioridade quando user tem múltiplas roles no mesmo Klub', async () => {
    const { handler } = buildHandler({
      memberships: [membership(KLUB_A)],
      roles: [
        { role: 'PLAYER', scopeKlubId: KLUB_A },
        { role: 'STAFF', scopeKlubId: KLUB_A },
        { role: 'KLUB_ADMIN', scopeKlubId: KLUB_A },
        { role: 'TEACHER', scopeKlubId: KLUB_A },
      ],
    });

    const result = await handler.execute(USER_ID);

    expect(result[0]?.role).toBe('KLUB_ADMIN');
  });

  it('retorna role: null quando user tem membership mas nenhuma RoleAssignment', async () => {
    const { handler } = buildHandler({
      memberships: [membership(KLUB_A)],
      roles: [],
    });

    const result = await handler.execute(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBeNull();
  });

  it('mapeia roles corretamente quando user tem múltiplos Klubs', async () => {
    const { handler } = buildHandler({
      memberships: [membership(KLUB_A), membership(KLUB_B), membership(KLUB_C)],
      roles: [
        { role: 'KLUB_ADMIN', scopeKlubId: KLUB_A },
        { role: 'PLAYER', scopeKlubId: KLUB_B },
        // KLUB_C: sem role
      ],
    });

    const result = await handler.execute(USER_ID);

    expect(result).toHaveLength(3);
    const byKlub = new Map(result.map((m) => [m.klubId, m.role]));
    expect(byKlub.get(KLUB_A)).toBe('KLUB_ADMIN');
    expect(byKlub.get(KLUB_B)).toBe('PLAYER');
    expect(byKlub.get(KLUB_C)).toBeNull();
  });

  it('ignora RoleAssignments globais (scopeKlubId=null) ao calcular role do Klub', async () => {
    const { handler } = buildHandler({
      memberships: [membership(KLUB_A)],
      roles: [
        { role: 'SUPER_ADMIN', scopeKlubId: null },
        { role: 'PLAYER', scopeKlubId: KLUB_A },
      ],
    });

    const result = await handler.execute(USER_ID);

    expect(result[0]?.role).toBe('PLAYER');
  });
});
