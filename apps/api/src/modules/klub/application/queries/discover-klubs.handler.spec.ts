import { describe, it, expect, vi } from 'vitest';
import { DiscoverKlubsHandler } from './discover-klubs.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlub {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  accessMode: string | null;
  contact: {
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  sportProfiles: { sportCode: string }[];
}

interface MockSpace {
  klubId: string;
  hourBands: { startHour: number; endHour: number }[];
}

function buildHandler(opts: { rows?: MockKlub[]; spaces?: MockSpace[] } = {}) {
  let lastWhere: Record<string, unknown> | null = null;
  const prisma = {
    klub: {
      findMany: vi.fn((args: { where: Record<string, unknown> }) => {
        lastWhere = args.where;
        return Promise.resolve(opts.rows ?? []);
      }),
    },
    space: {
      findMany: vi.fn(() => Promise.resolve(opts.spaces ?? [])),
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
  latitude: number | null = null,
  longitude: number | null = null,
): MockKlub => ({
  id,
  name,
  slug: id,
  type: 'sports_club',
  status: 'active',
  accessMode,
  contact: { city, state, latitude, longitude },
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
    expect(getLastWhere()?.contact).toEqual({ is: { state: 'RJ' } });
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

  it('com lat/lng: ordena por distância ASC e popula distanceKm', async () => {
    // User no Rio (-22.9, -43.2). Niterói ~10km, SP ~360km.
    const rows: MockKlub[] = [
      k('sp', 'SP Klub', 'São Paulo', 'SP', 'public', ['tennis'], -23.55, -46.63),
      k('nit', 'Niterói Klub', 'Niterói', 'RJ', 'public', ['tennis'], -22.88, -43.1),
    ];
    const { handler } = buildHandler({ rows });
    const result = await handler.execute({ lat: -22.9, lng: -43.2 });
    expect(result.map((r) => r.name)).toEqual(['Niterói Klub', 'SP Klub']);
    expect(result[0]?.distanceKm).not.toBeNull();
    expect(result[0]?.distanceKm).toBeLessThan(20);
    expect(result[1]?.distanceKm).toBeGreaterThan(300);
  });

  it('com radiusKm: filtra resultados fora do raio', async () => {
    const rows: MockKlub[] = [
      k('sp', 'SP Klub', 'São Paulo', 'SP', 'public', ['tennis'], -23.55, -46.63),
      k('nit', 'Niterói Klub', 'Niterói', 'RJ', 'public', ['tennis'], -22.88, -43.1),
    ];
    const { handler } = buildHandler({ rows });
    const result = await handler.execute({ lat: -22.9, lng: -43.2, radiusKm: 50 });
    expect(result.map((r) => r.name)).toEqual(['Niterói Klub']);
  });

  it('com geo: Klubs sem lat/lng vão pro fim sem distance', async () => {
    const rows: MockKlub[] = [
      k('nogeo', 'Klub Sem Geo', 'Rio', 'RJ'),
      k('nit', 'Niterói Klub', 'Niterói', 'RJ', 'public', ['tennis'], -22.88, -43.1),
    ];
    const { handler } = buildHandler({ rows });
    const result = await handler.execute({ lat: -22.9, lng: -43.2 });
    expect(result.map((r) => r.name)).toEqual(['Niterói Klub', 'Klub Sem Geo']);
    expect(result[1]?.distanceKm).toBeNull();
  });

  it('period=morning: filtra Klubs com Spaces operando manhã (6h-12h)', async () => {
    const rows: MockKlub[] = [k('a', 'Klub Manhã'), k('b', 'Klub Só Noite')];
    const spaces: MockSpace[] = [
      { klubId: 'a', hourBands: [{ startHour: 8, endHour: 18 }] },
      { klubId: 'b', hourBands: [{ startHour: 18, endHour: 22 }] },
    ];
    const { handler } = buildHandler({ rows, spaces });
    const result = await handler.execute({ period: 'morning' });
    expect(result.map((r) => r.name)).toEqual(['Klub Manhã']);
  });

  it('period=evening: aceita banda que toca o início do período', async () => {
    const rows: MockKlub[] = [k('a', 'Klub Evening')];
    const spaces: MockSpace[] = [{ klubId: 'a', hourBands: [{ startHour: 18, endHour: 22 }] }];
    const { handler } = buildHandler({ rows, spaces });
    const result = await handler.execute({ period: 'evening' });
    expect(result).toHaveLength(1);
  });

  it('period sem nenhum Space matching retorna lista vazia', async () => {
    const rows: MockKlub[] = [k('a', 'Klub')];
    const spaces: MockSpace[] = [{ klubId: 'a', hourBands: [{ startHour: 5, endHour: 6 }] }];
    const { handler } = buildHandler({ rows, spaces });
    const result = await handler.execute({ period: 'evening' });
    expect(result).toHaveLength(0);
  });
});
