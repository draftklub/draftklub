import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateKlubHandler } from './update-klub.handler';

const KLUB_ID = '00000000-0000-0000-0001-000000000001';

function makeKlub(overrides: { deletedAt?: Date | null } = {}) {
  return {
    id: KLUB_ID,
    name: 'Old Name',
    slug: 'old-slug',
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makePrisma(klub: ReturnType<typeof makeKlub> | null) {
  return {
    klub: {
      findUnique: vi.fn().mockResolvedValue(klub),
      update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: KLUB_ID, ...args.data }),
      ),
    },
  };
}

describe('UpdateKlubHandler', () => {
  let handler: UpdateKlubHandler;

  beforeEach(() => {
    handler = new UpdateKlubHandler({} as never);
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
