import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { CreateKlubHandler } from './create-klub.handler';
import type { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import type { EncryptionService } from '../../../../shared/encryption/encryption.service';

const NEW_KLUB_ID = '00000000-0000-0000-0099-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';

function buildHandler(
  opts: {
    existingSlugs?: string[];
  } = {},
) {
  const repo = {
    findBySlug: vi.fn((slug: string) => {
      if (opts.existingSlugs?.includes(slug)) {
        return Promise.resolve({ id: 'existing-id', slug });
      }
      return Promise.resolve(null);
    }),
    create: vi.fn(
      (data: { name: string; slug: string; type: string; plan: string; createdById?: string }) =>
        Promise.resolve({
          id: NEW_KLUB_ID,
          name: data.name,
          slug: data.slug,
          type: data.type,
          plan: data.plan,
          status: data.plan === 'trial' ? 'trial' : 'active',
          city: null,
          state: null,
        }),
    ),
  };

  const encryption = {
    encrypt: vi.fn().mockReturnValue({ encrypted: 'enc', iv: 'iv' }),
  };

  const handler = new CreateKlubHandler(
    repo as unknown as KlubPrismaRepository,
    encryption as unknown as EncryptionService,
  );

  return { handler, repo, encryption };
}

describe('CreateKlubHandler — slug optional + auto-generated', () => {
  it('gera slug do name quando slug nao eh fornecido', async () => {
    const { handler, repo } = buildHandler();

    const result = await handler.execute({
      name: 'Tennis Club Carioca',
      createdById: USER_ID,
    });

    expect(result.slug).toBe('tennis-club-carioca');
    expect(repo.findBySlug).toHaveBeenCalledWith('tennis-club-carioca');
  });

  it('faz fallback pra base+city quando slug base ja existe', async () => {
    const { handler } = buildHandler({ existingSlugs: ['tennis-clube'] });

    const result = await handler.execute({
      name: 'Tennis Clube',
      city: 'São Paulo',
      createdById: USER_ID,
    });

    expect(result.slug).toBe('tennis-clube-sao-paulo');
  });
});

describe('CreateKlubHandler — slug provided by client', () => {
  it('aceita slug do cliente quando disponivel', async () => {
    const { handler, repo } = buildHandler();

    const result = await handler.execute({
      name: 'Klub Custom',
      slug: 'meu-slug-favorito',
      createdById: USER_ID,
    });

    expect(result.slug).toBe('meu-slug-favorito');
    expect(repo.findBySlug).toHaveBeenCalledWith('meu-slug-favorito');
    // Nao deve cair no generateSlug; valida-se chamando findBySlug exatamente uma vez
    expect(repo.findBySlug).toHaveBeenCalledTimes(1);
  });

  it('rejeita 409 ConflictException quando slug fornecido ja esta em uso', async () => {
    const { handler } = buildHandler({ existingSlugs: ['tennis-rj'] });

    const promise = handler.execute({
      name: 'Outro Klub',
      slug: 'tennis-rj',
      createdById: USER_ID,
    });

    await expect(promise).rejects.toThrow(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: expect.objectContaining({
        type: 'slug_unavailable',
        slug: 'tennis-rj',
      }) as Record<string, unknown>,
    });
  });

  it('nao chama generateSlug nem o fallback de cidade quando slug eh fornecido', async () => {
    const { handler, repo } = buildHandler();

    await handler.execute({
      name: 'Qualquer Coisa',
      slug: 'slug-explicito',
      city: 'Rio de Janeiro',
      createdById: USER_ID,
    });

    // findBySlug deve ser chamado apenas pra validar 'slug-explicito',
    // nao pra checar variantes do generateSlug.
    expect(repo.findBySlug).toHaveBeenCalledTimes(1);
    expect(repo.findBySlug).toHaveBeenCalledWith('slug-explicito');
  });
});
