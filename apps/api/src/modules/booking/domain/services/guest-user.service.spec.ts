import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuestUserService } from './guest-user.service';

describe('GuestUserService', () => {
  let svc: GuestUserService;
  let userFindMany: ReturnType<typeof vi.fn>;
  let userFindUnique: ReturnType<typeof vi.fn>;
  let userCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    userFindMany = vi.fn();
    userFindUnique = vi.fn();
    userCreate = vi.fn();
    const prisma = {
      user: { findMany: userFindMany, findUnique: userFindUnique, create: userCreate },
    };
    svc = new GuestUserService(prisma as never);
  });

  it('search por email retorna match', async () => {
    userFindMany.mockResolvedValue([
      {
        id: 'u1',
        fullName: 'Carlos Silva',
        email: 'carlos@x.com',
        kind: 'regular',
        documentNumber: null,
      },
    ]);
    const r = await svc.search('carlos@x.com');
    expect(r).toHaveLength(1);
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: { contains: 'carlos@x.com', mode: 'insensitive' } }),
          ]) as unknown,
        }) as unknown,
      }),
    );
  });

  it('search por nome retorna match', async () => {
    userFindMany.mockResolvedValue([
      {
        id: 'u2',
        fullName: 'Carlos Lima',
        email: 'lima@x.com',
        kind: 'regular',
        documentNumber: null,
      },
    ]);
    const r = await svc.search('Carlos');
    expect(r).toHaveLength(1);
  });

  it('createOrGet cria novo guest quando email nao existe', async () => {
    userFindUnique.mockResolvedValue(null);
    userCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'new-guest', ...args.data }),
    );

    const r = await svc.createOrGet({
      firstName: 'Carlos',
      lastName: 'Silva',
      email: 'guest@x.com',
    });

    expect(r).toMatchObject({ kind: 'guest', firebaseUid: null, fullName: 'Carlos Silva' });
    expect(userCreate).toHaveBeenCalledOnce();
  });

  it('createOrGet retorna existente sem criar', async () => {
    userFindUnique.mockResolvedValue({ id: 'existing', email: 'guest@x.com', kind: 'regular' });

    const r = await svc.createOrGet({
      firstName: 'Carlos',
      lastName: 'Silva',
      email: 'guest@x.com',
    });

    expect(r.id).toBe('existing');
    expect(userCreate).not.toHaveBeenCalled();
  });
});
