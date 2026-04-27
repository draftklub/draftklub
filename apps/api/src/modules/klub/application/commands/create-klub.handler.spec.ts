import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateKlubHandler } from './create-klub.handler';
import type { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import type { EncryptionService } from '../../../../shared/encryption/encryption.service';
import type { CepGeocoderService } from '../../../../shared/geocoding/cep-geocoder.service';
import type { CnpjLookupService } from '../../../../shared/lookup/cnpj-lookup.service';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

const NEW_KLUB_ID = '00000000-0000-0000-0099-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';

interface BuildOpts {
  existingSlugs?: string[];
  existingUserCpf?: string | null;
  cnpjLookup?: { razaoSocial?: string; situacaoCadastral?: string } | null;
}

function buildHandler(opts: BuildOpts = {}) {
  const repo = {
    findBySlug: vi.fn((slug: string) => {
      if (opts.existingSlugs?.includes(slug)) {
        return Promise.resolve({ id: 'existing-id', slug });
      }
      return Promise.resolve(null);
    }),
    create: vi.fn((data: { name: string; slug: string; type: string; plan: string }) =>
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

  const geocoder = {
    geocode: vi.fn(() => Promise.resolve(null)),
  };

  const cnpjLookup = {
    lookup: vi.fn(() =>
      Promise.resolve(
        opts.cnpjLookup === undefined
          ? null
          : opts.cnpjLookup === null
            ? null
            : {
                razaoSocial: opts.cnpjLookup.razaoSocial ?? null,
                nomeFantasia: null,
                situacaoCadastral: opts.cnpjLookup.situacaoCadastral ?? 'ativa',
                descricaoSituacao: null,
                dataSituacao: null,
                endereco: {
                  logradouro: null,
                  numero: null,
                  complemento: null,
                  bairro: null,
                  municipio: null,
                  uf: null,
                  cep: null,
                },
                contato: { telefone: null, email: null },
                capitalSocial: null,
                atividadePrimaria: null,
                dataAbertura: null,
                raw: {},
              },
      ),
    ),
  };

  const userUpdate = vi.fn(() => Promise.resolve({}));
  const prisma = {
    user: {
      findUnique: vi.fn(() => Promise.resolve({ documentNumber: opts.existingUserCpf ?? null })),
      update: userUpdate,
    },
  };

  const handler = new CreateKlubHandler(
    repo as unknown as KlubPrismaRepository,
    encryption as unknown as EncryptionService,
    geocoder as unknown as CepGeocoderService,
    cnpjLookup as unknown as CnpjLookupService,
    prisma as unknown as PrismaService,
  );

  return { handler, repo, encryption, geocoder, cnpjLookup, prisma, userUpdate };
}

// CPFs de teste com checksum válido (módulo 11)
const VALID_CPF = '11144477735';
const VALID_CNPJ = '11222333000181'; // checksum não validado pra CNPJ no DocumentVO se algoritmo aceitar

describe('CreateKlubHandler — Sprint D PR1 (review pending + CNPJ lookup + CPF inline)', () => {
  it('PJ exige CNPJ; rejeita BadRequest se ausente', async () => {
    const { handler } = buildHandler();
    await expect(
      handler.execute({
        name: 'Test Klub',
        entityType: 'pj',
        createdById: USER_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PF exige CPF; rejeita BadRequest se user.documentNumber=null e creatorCpf ausente', async () => {
    const { handler } = buildHandler({ existingUserCpf: null });
    await expect(
      handler.execute({
        name: 'PF Klub',
        entityType: 'pf',
        createdById: USER_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PF salva CPF no User quando User.documentNumber=null e creatorCpf é válido', async () => {
    const { handler, userUpdate } = buildHandler({ existingUserCpf: null });
    const result = await handler.execute({
      name: 'PF Klub',
      entityType: 'pf',
      creatorCpf: VALID_CPF,
      createdById: USER_ID,
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { documentNumber: VALID_CPF, documentType: 'cpf' },
    });
    expect(result.reviewStatus).toBe('pending');
  });

  it('PF rejeita Conflict se creatorCpf difere do User.documentNumber existente', async () => {
    const { handler } = buildHandler({ existingUserCpf: '52998224725' });
    await expect(
      handler.execute({
        name: 'PF Klub',
        entityType: 'pf',
        creatorCpf: VALID_CPF,
        createdById: USER_ID,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('PF aceita sem creatorCpf quando User já tem documentNumber', async () => {
    const { handler, userUpdate } = buildHandler({ existingUserCpf: VALID_CPF });
    const result = await handler.execute({
      name: 'PF Klub',
      entityType: 'pf',
      createdById: USER_ID,
    });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(result.reviewStatus).toBe('pending');
  });

  it('slug é gerado de name+neighborhood+city, sem slug do cliente', async () => {
    const { handler, repo } = buildHandler({ existingUserCpf: VALID_CPF });
    const result = await handler.execute({
      name: 'Tennis Club',
      entityType: 'pf',
      addressNeighborhood: 'Botafogo',
      city: 'Rio de Janeiro',
      createdById: USER_ID,
    });
    expect(result.slug).toBe('tennis-club-botafogo-rio-de-janeiro');
    expect(repo.findBySlug).toHaveBeenCalledWith('tennis-club-botafogo-rio-de-janeiro');
  });

  it('slug ganha sufixo -2 quando base já existe', async () => {
    const { handler } = buildHandler({
      existingUserCpf: VALID_CPF,
      existingSlugs: ['tennis-club-botafogo'],
    });
    const result = await handler.execute({
      name: 'Tennis Club',
      entityType: 'pf',
      addressNeighborhood: 'Botafogo',
      createdById: USER_ID,
    });
    expect(result.slug).toBe('tennis-club-botafogo-2');
  });

  it('PJ chama CnpjLookupService e popula legalName se ausente', async () => {
    const { handler, cnpjLookup, repo } = buildHandler({
      cnpjLookup: { razaoSocial: 'TENNIS CLUB LTDA', situacaoCadastral: 'ativa' },
    });
    await handler.execute({
      name: 'Tennis Club',
      entityType: 'pj',
      document: VALID_CNPJ,
      createdById: USER_ID,
    });
    expect(cnpjLookup.lookup).toHaveBeenCalled();
    const repoCall = repo.create.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(repoCall?.legalName).toBe('TENNIS CLUB LTDA');
    expect(repoCall?.cnpjStatus).toBe('ativa');
    expect(repoCall?.reviewStatus).toBe('pending');
  });

  it('reviewStatus do resultado sempre vem como pending', async () => {
    const { handler } = buildHandler({ existingUserCpf: VALID_CPF });
    const result = await handler.execute({
      name: 'Klub PF',
      entityType: 'pf',
      createdById: USER_ID,
    });
    expect(result.reviewStatus).toBe('pending');
  });
});
