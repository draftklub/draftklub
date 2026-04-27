import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateMeHandler } from './update-me.handler';
import { UpdateMeSchema } from '../../api/dtos/update-me.dto';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

const USER_ID = '00000000-0000-0000-0001-000000000aaa';

function buildHandler(opts: { update?: object | Error } = {}) {
  const prisma = {
    user: {
      update: vi.fn((args: { data: Record<string, unknown> }) => {
        if (opts.update instanceof Error) return Promise.reject(opts.update);
        const merged = {
          id: USER_ID,
          email: 'test@example.com',
          firebaseUid: 'fb-1',
          fullName: 'Original',
          phone: null,
          birthDate: null,
          avatarUrl: null,
          gender: null,
          city: null,
          state: null,
          ...(opts.update ?? {}),
          ...args.data,
        };
        return Promise.resolve(merged);
      }),
    },
  };
  const handler = new UpdateMeHandler(prisma as unknown as PrismaService);
  return { handler, prisma };
}

describe('UpdateMeHandler', () => {
  it('partial update — só fields presentes no DTO são tocados', async () => {
    const { handler, prisma } = buildHandler();

    await handler.execute({
      userId: USER_ID,
      roleAssignments: [],
      dto: { phone: '21988888888', city: 'São Paulo' },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { phone: '21988888888', city: 'São Paulo' },
    });
  });

  it('birthDate string ISO eh convertido pra Date', async () => {
    const { handler, prisma } = buildHandler();

    await handler.execute({
      userId: USER_ID,
      roleAssignments: [],
      dto: { birthDate: '1990-05-15' },
    });

    const calledData = prisma.user.update.mock.calls[0]?.[0]?.data;
    expect(calledData?.birthDate).toBeInstanceOf(Date);
  });

  it('lança NotFoundException quando Prisma retorna P2025', async () => {
    const err = Object.assign(new Error('not found'), { code: 'P2025' });
    const { handler } = buildHandler({ update: err });

    await expect(
      handler.execute({ userId: USER_ID, roleAssignments: [], dto: { city: 'Rio' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('retorna MeResponse com birthDate serializado como ISO', async () => {
    const { handler } = buildHandler({
      update: { birthDate: new Date('2000-01-01T00:00:00Z') },
    });

    const result = await handler.execute({
      userId: USER_ID,
      roleAssignments: [],
      dto: { birthDate: '2000-01-01' },
    });

    expect(result.birthDate).toBe('2000-01-01');
  });
});

describe('UpdateMeSchema (Zod)', () => {
  it('rejeita gender desconhecido', () => {
    const result = UpdateMeSchema.safeParse({ gender: 'other' });
    expect(result.success).toBe(false);
  });

  it('rejeita state lowercase', () => {
    const result = UpdateMeSchema.safeParse({ state: 'rj' });
    expect(result.success).toBe(false);
  });

  it('rejeita state com 3 letras', () => {
    const result = UpdateMeSchema.safeParse({ state: 'RJX' });
    expect(result.success).toBe(false);
  });

  it('aceita body parcial vazio', () => {
    const result = UpdateMeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('aceita state válido (UF)', () => {
    const result = UpdateMeSchema.safeParse({ state: 'SP' });
    expect(result.success).toBe(true);
  });

  it('rejeita birthDate em formato inválido', () => {
    const result = UpdateMeSchema.safeParse({ birthDate: '15/05/1990' });
    expect(result.success).toBe(false);
  });
});
