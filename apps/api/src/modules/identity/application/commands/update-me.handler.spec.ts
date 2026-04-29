import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateMeHandler } from './update-me.handler';
import { UpdateMeSchema } from '../../api/dtos/update-me.dto';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { CepGeocoderService } from '../../../../shared/geocoding/cep-geocoder.service';

const USER_ID = '00000000-0000-0000-0001-000000000aaa';

function buildHandler(
  opts: { update?: object | Error; geocode?: { latitude: number; longitude: number } | null } = {},
) {
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
          cep: null,
          addressStreet: null,
          addressNumber: null,
          addressComplement: null,
          addressNeighborhood: null,
          latitude: null,
          longitude: null,
          documentNumber: null,
          documentType: null,
          notificationPrefs: {},
          ...(opts.update ?? {}),
          ...args.data,
        };
        return Promise.resolve(merged);
      }),
    },
  };
  const geocoder = {
    geocode: vi.fn(() => Promise.resolve(opts.geocode ?? null)),
  };
  const encryption = {
    encryptToString: (s: string | null | undefined) => (s === undefined ? null : s),
    decryptFromString: (s: string | null) => s,
  };
  const handler = new UpdateMeHandler(
    prisma as unknown as PrismaService,
    geocoder as unknown as CepGeocoderService,
    encryption as never,
  );
  return { handler, prisma, geocoder };
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

  it('aceita CPF válido (11 dígitos com checksum correto)', () => {
    // CPF teste válido pelo módulo 11
    const result = UpdateMeSchema.safeParse({ documentNumber: '11144477735' });
    expect(result.success).toBe(true);
  });

  it('rejeita CPF com checksum inválido', () => {
    const result = UpdateMeSchema.safeParse({ documentNumber: '12345678900' });
    expect(result.success).toBe(false);
  });

  it('rejeita CPF com formato (deve ser só dígitos)', () => {
    const result = UpdateMeSchema.safeParse({ documentNumber: '111.444.777-35' });
    expect(result.success).toBe(false);
  });

  it('aceita CEP de 8 dígitos', () => {
    const result = UpdateMeSchema.safeParse({ cep: '22440000' });
    expect(result.success).toBe(true);
  });

  it('rejeita CEP com hífen', () => {
    const result = UpdateMeSchema.safeParse({ cep: '22440-000' });
    expect(result.success).toBe(false);
  });
});
