import { describe, it, expect, vi } from 'vitest';
import { DiscoverKlubsHandler } from './discover-klubs.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlub {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  city: string | null;
  state: string | null;
  accessMode: string | null;
  sportProfiles: { sportCode: string }[];
}

function buildHandler(opts: { rows?: MockKlub[] } = {}) {
  let lastWhere: Record<string, unknown> | null = null;
  const prisma = {
    klub: {
      findMany: vi.fn((args: { where: Record<string, unknown> }) => {
        lastWhere = args.where;
        return Promise.resolve(opts.rows ?? []);
      }),
    },
  };
  const handler = new DiscoverKlubsHandler(prisma as unknown as PrismaService);
  return {
    handler,
    prisma,
    getLastWhere: () => lastWhere,
  };
}

const k = (
  id: string,
  name: string,
  city: string | null = null,
  state: string | null = null,
  accessMode = 'public',
  sportCodes: string[] = ['tennis'],
): MockKlub => ({
  id,
  name,
  slug: id,
  type: 'sports_club',
  status: 'active',
  city,
  state,
  accessMode,
  sportProfiles: sportCodes.map((c) => ({ sportCode: c })),
});

describe('DiscoverKlubsHandler', () => {
  it('aplica where com discoverable=true + status active/trial + deletedAt null', async () => {
    const { handler, getLastWhere } = buildHandler({ rows: [] });
    await handler.execute({});
    const where = getLastWhere();
    expect(where).toMatchObject({
      discoverable: true,
      deletedAt: null,
      status: { in: ['active', 'trial'] },
    });
  });

  it('filtra por q case-insensitive (Prisma contains mode insensitive)', async () => {
    const { handler, getLastWhere } = buildHandler({ rows: [] });
    await handler.execute({ q: 'tennis' });
    const where = getLastWhere();
    expect(where?.name).toEqual({ contains: 'tennis', mode: 'insensitive' });
  });

  it('filtra por UF exato', async () => {
    const { handler, getLastWhere } = buildHandler({ rows: [] });
    await handler.execute({ state: 'RJ' });
    expect(getLastWhere()?.state).toBe('RJ');
  });

  it('filtra por sport via sportProfiles.some active', async () => {
    const { handler, getLastWhere } = buildHandler({ rows: [] });
    await handler.execute({ sport: 'padel' });
    expect(getLastWhere()?.sportProfiles).toEqual({
      some: { sportCode: 'padel', status: 'active' },
    });
  });

  it('sort tier-based: same-city → same-state → resto, alfabético dentro', async () => {
    const rows: MockKlub[] = [
      k('a', 'Bravo', 'Niterói', 'RJ'),
      k('b', 'Alpha', 'Rio de Janeiro', 'RJ'),
      k('c', 'Charlie', 'São Paulo', 'SP'),
      k('d', 'Delta', 'Rio de Janeiro', 'RJ'),
    ];
    const { handler } = buildHandler({ rows });

    const result = await handler.execute({
      userCity: 'Rio de Janeiro',
      userState: 'RJ',
    });

    // Tier 0 (Rio de Janeiro): Alpha, Delta
    // Tier 1 (RJ não-Rio): Bravo
    // Tier 2 (outro): Charlie
    expect(result.map((r) => r.name)).toEqual(['Alpha', 'Delta', 'Bravo', 'Charlie']);
  });

  it('respeita limit (default 24, max 50)', async () => {
    const { handler, prisma } = buildHandler({ rows: [] });
    await handler.execute({ limit: 10 });
    expect(prisma.klub.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    await handler.execute({ limit: 999 });
    expect(prisma.klub.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 50 }));
    await handler.execute({});
    expect(prisma.klub.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 24 }));
  });

  it('inclui sports apenas active no resultado', async () => {
    const rows: MockKlub[] = [k('a', 'Klub Test', 'Rio', 'RJ', 'public', ['tennis', 'padel'])];
    const { handler } = buildHandler({ rows });
    const result = await handler.execute({});
    expect(result[0]?.sports).toEqual(['tennis', 'padel']);
  });

  it('mapeia accessMode null → public default', async () => {
    const rows: MockKlub[] = [{ ...k('a', 'A'), accessMode: null }];
    const { handler } = buildHandler({ rows });
    const result = await handler.execute({});
    expect(result[0]?.accessMode).toBe('public');
  });
});
