import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetMeHandler } from './get-me.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

const USER_ID = '00000000-0000-0000-0001-000000000aaa';

function buildHandler(opts: { user?: object | null } = {}) {
  const prisma = {
    user: {
      findUnique: vi.fn(() => Promise.resolve(opts.user ?? null)),
    },
  };
  const handler = new GetMeHandler(prisma as unknown as PrismaService);
  return { handler, prisma };
}

describe('GetMeHandler', () => {
  it('mapeia row do User pra MeResponse com birthDate ISO', async () => {
    const { handler } = buildHandler({
      user: {
        id: USER_ID,
        email: 'test@example.com',
        firebaseUid: 'fb-1',
        fullName: 'Test User',
        phone: '21999999999',
        birthDate: new Date('1990-05-15T00:00:00Z'),
        avatarUrl: 'https://example.com/avatar.png',
        gender: 'male',
        city: 'Rio de Janeiro',
        state: 'RJ',
        cep: '22440000',
        addressStreet: 'Av Atlântica',
        addressNumber: '1500',
        addressComplement: 'apto 301',
        addressNeighborhood: 'Copacabana',
        documentNumber: '11144477735',
        documentType: 'cpf',
      },
    });

    const result = await handler.execute(USER_ID, []);

    expect(result).toEqual({
      id: USER_ID,
      email: 'test@example.com',
      firebaseUid: 'fb-1',
      fullName: 'Test User',
      phone: '21999999999',
      birthDate: '1990-05-15',
      avatarUrl: 'https://example.com/avatar.png',
      gender: 'male',
      city: 'Rio de Janeiro',
      state: 'RJ',
      cep: '22440000',
      addressStreet: 'Av Atlântica',
      addressNumber: '1500',
      addressComplement: 'apto 301',
      addressNeighborhood: 'Copacabana',
      documentNumber: '11144477735',
      documentType: 'cpf',
      roleAssignments: [],
    });
  });

  it('null-safe para fields opcionais não setados', async () => {
    const { handler } = buildHandler({
      user: {
        id: USER_ID,
        email: 'min@example.com',
        firebaseUid: null,
        fullName: 'Min User',
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
        documentNumber: null,
        documentType: null,
      },
    });

    const result = await handler.execute(USER_ID, []);

    expect(result.phone).toBeNull();
    expect(result.birthDate).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.city).toBeNull();
    expect(result.state).toBeNull();
    expect(result.cep).toBeNull();
    expect(result.addressStreet).toBeNull();
    expect(result.documentNumber).toBeNull();
    expect(result.documentType).toBeNull();
  });

  it('lança NotFoundException quando user não existe', async () => {
    const { handler } = buildHandler({ user: null });
    await expect(handler.execute(USER_ID, [])).rejects.toThrow(NotFoundException);
  });

  it('passa roleAssignments do contexto direto pro response', async () => {
    const { handler } = buildHandler({
      user: {
        id: USER_ID,
        email: 'admin@example.com',
        firebaseUid: 'fb-1',
        fullName: 'Admin',
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
        documentNumber: null,
        documentType: null,
      },
    });

    const roles = [{ role: 'KLUB_ADMIN' as const, scopeKlubId: 'klub-1', scopeSportId: null }];
    const result = await handler.execute(USER_ID, roles);
    expect(result.roleAssignments).toEqual(roles);
  });
});
