import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateKlubHandler } from './update-klub.handler';
import type { EncryptionService } from '../../../../shared/encryption/encryption.service';

const KLUB_ID = '00000000-0000-0000-0001-000000000001';

function makeKlub(overrides: { deletedAt?: Date | null; slug?: string } = {}) {
  return {
    id: KLUB_ID,
    name: 'Old Name',
    slug: overrides.slug ?? 'old-slug',
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makePrisma(
  klub: ReturnType<typeof makeKlub> | null,
  slugConflict?: { id: string; name: string },
) {
  return {
    klub: {
      findUnique: vi.fn().mockResolvedValue(klub),
      findFirst: vi.fn().mockResolvedValue(slugConflict ?? null),
      update: vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: KLUB_ID, ...args.data }),
        ),
    },
    klubLegal: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

const encryption = {
  encrypt: vi.fn().mockReturnValue({ encrypted: 'enc-base64', iv: 'iv-hex' }),
  decrypt: vi.fn(),
} as unknown as EncryptionService;

describe('UpdateKlubHandler', () => {
  let handler: UpdateKlubHandler;

  beforeEach(() => {
    handler = new UpdateKlubHandler({} as never, encryption);
    vi.clearAllMocks();
  });

  it('KLUB_ADMIN edita campos user-facing', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      klubId: KLUB_ID,
      isSuperAdmin: false,
      patch: { name: 'New Name', email: 'new@klub.com', discoverable: true },
    });
    expect(prisma.klub.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.klub.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArg.data).toEqual({ name: 'New Name', email: 'new@klub.com', discoverable: true });
    expect(result).toBeDefined();
  });

  it('KLUB_ADMIN edita abbreviation e commonName (Sprint PR-G)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute({
      klubId: KLUB_ID,
      isSuperAdmin: false,
      patch: { abbreviation: 'PAC', commonName: 'Paissandú' },
    });
    const updateArg = prisma.klub.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArg.data).toEqual({ abbreviation: 'PAC', commonName: 'Paissandú' });
  });

  it('KLUB_ADMIN é bloqueado em campo super-admin (status)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        isSuperAdmin: false,
        patch: { name: 'X', status: 'active' },
      }),
    ).rejects.toThrow(/só pode ser alterado por SUPER_ADMIN/);
    expect(prisma.klub.update).not.toHaveBeenCalled();
  });

  it('KLUB_ADMIN é bloqueado em slug (Sprint PR-G)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        isSuperAdmin: false,
        patch: { slug: 'novo-slug' },
      }),
    ).rejects.toThrow(/slug.*só pode ser alterado por SUPER_ADMIN/);
  });

  it('SUPER_ADMIN edita campos sensíveis (plan/status/maxMembers)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute({
      klubId: KLUB_ID,
      isSuperAdmin: true,
      patch: { plan: 'pro', status: 'active', maxMembers: 200 },
    });
    const updateArg = prisma.klub.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArg.data).toEqual({ plan: 'pro', status: 'active', maxMembers: 200 });
  });

  it('SUPER_ADMIN troca slug livre OK (Sprint PR-G)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute({
      klubId: KLUB_ID,
      isSuperAdmin: true,
      patch: { slug: 'novo-slug' },
    });
    expect(prisma.klub.findFirst).toHaveBeenCalledWith({
      where: { slug: 'novo-slug', id: { not: KLUB_ID }, deletedAt: null },
      select: { id: true, name: true },
    });
    const updateArg = prisma.klub.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateArg.data.slug).toBe('novo-slug');
  });

  it('SUPER_ADMIN slug em uso → 409 (Sprint PR-G)', async () => {
    const prisma = makePrisma(makeKlub(), { id: 'other-klub', name: 'Outro Klub' });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ klubId: KLUB_ID, isSuperAdmin: true, patch: { slug: 'taken-slug' } }),
    ).rejects.toThrow(/já está em uso/);
    expect(prisma.klub.update).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN troca CNPJ → re-encripta via klubLegal.upsert (Sprint PR-G + DB-6a)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    // CNPJ válido (Petrobras): 33000167000101
    await handler.execute({
      klubId: KLUB_ID,
      isSuperAdmin: true,
      patch: { document: '33000167000101' },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const encryptMock = encryption.encrypt as ReturnType<typeof vi.fn>;
    expect(encryptMock).toHaveBeenCalledWith('33000167000101');
    // Legal fields go to klubLegal.upsert (not klub.update) after DB-6a
    const upsertArg = prisma.klubLegal.upsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(upsertArg.update.documentEncrypted).toBe('enc-base64');
    expect(upsertArg.update.documentIv).toBe('iv-hex');
    expect(typeof upsertArg.update.documentHint).toBe('string');
    expect(prisma.klub.update).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN CNPJ inválido → 400 (Sprint PR-G)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        klubId: KLUB_ID,
        isSuperAdmin: true,
        patch: { document: '12345678901234' }, // dígito verificador inválido
      }),
    ).rejects.toThrow(/CNPJ inválido/);
  });

  it('404 quando Klub não existe', async () => {
    (handler as unknown as { prisma: unknown }).prisma = makePrisma(null);
    await expect(
      handler.execute({ klubId: KLUB_ID, isSuperAdmin: false, patch: { name: 'X' } }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('404 quando Klub deletedAt', async () => {
    (handler as unknown as { prisma: unknown }).prisma = makePrisma(
      makeKlub({ deletedAt: new Date() }),
    );
    await expect(
      handler.execute({ klubId: KLUB_ID, isSuperAdmin: true, patch: { name: 'X' } }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('rejeita patch vazio (nenhum campo conhecido)', async () => {
    const prisma = makePrisma(makeKlub());
    (handler as unknown as { prisma: unknown }).prisma = prisma;
    await expect(
      handler.execute({ klubId: KLUB_ID, isSuperAdmin: false, patch: {} }),
    ).rejects.toThrow(/Nenhum campo válido/);
  });
});
