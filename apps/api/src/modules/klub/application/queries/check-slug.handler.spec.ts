import { describe, it, expect, vi } from 'vitest';
import { CheckSlugHandler } from './check-slug.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlubBySlug {
  name: string;
  deletedAt: Date | null;
}

function buildHandler(opts: { existingSlugs?: Record<string, MockKlubBySlug> } = {}) {
  const calls: string[] = [];
  const prisma = {
    klub: {
      findUnique: vi.fn(({ where }: { where: { slug: string } }) => {
        calls.push(where.slug);
        const klub = opts.existingSlugs?.[where.slug];
        return Promise.resolve(klub ?? null);
      }),
    },
  };
  const handler = new CheckSlugHandler(prisma as unknown as PrismaService);
  return { handler, prisma, calls };
}

describe('CheckSlugHandler', () => {
  it('retorna available=true quando slug livre', async () => {
    const { handler } = buildHandler();
    const result = await handler.execute({
      name: 'Tennis Club',
      neighborhood: 'Botafogo',
      city: 'Rio de Janeiro',
    });
    expect(result.slug).toBe('tennis-club-botafogo-rio-de-janeiro');
    expect(result.available).toBe(true);
    expect(result.suggestedSlug).toBeNull();
  });

  it('retorna available=false com sugestão `-2` quando base está taken', async () => {
    const { handler } = buildHandler({
      existingSlugs: {
        'tennis-club-botafogo': { name: 'Tennis Club Original', deletedAt: null },
      },
    });
    const result = await handler.execute({
      name: 'Tennis Club',
      neighborhood: 'Botafogo',
    });
    expect(result.slug).toBe('tennis-club-botafogo');
    expect(result.available).toBe(false);
    expect(result.suggestedSlug).toBe('tennis-club-botafogo-2');
    expect(result.conflictKlubName).toBe('Tennis Club Original');
  });

  it('soft-deleted Klub não conflita com slug', async () => {
    const { handler } = buildHandler({
      existingSlugs: {
        'tennis-club-botafogo': { name: 'Old Klub', deletedAt: new Date() },
      },
    });
    const result = await handler.execute({
      name: 'Tennis Club',
      neighborhood: 'Botafogo',
    });
    expect(result.available).toBe(true);
  });

  it('nome só com símbolos retorna slug vazio + available=false sem checar DB', async () => {
    const { handler, calls } = buildHandler();
    const result = await handler.execute({ name: '!!!' });
    expect(result.slug).toBe('');
    expect(result.available).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('usa só name quando neighborhood/city ausentes', async () => {
    const { handler } = buildHandler();
    const result = await handler.execute({ name: 'Klub Único' });
    expect(result.slug).toBe('klub-unico');
  });
});
