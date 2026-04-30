import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestMembershipHandler } from './request-membership.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

interface MockKlub {
  id: string;
  name: string;
  discovery: { accessMode: string } | null;
  review: { reviewStatus: string } | null;
  deletedAt: Date | null;
}

function buildHandler(opts: {
  klub?: MockKlub | null;
  membership?: { status: string } | null;
  duplicatePending?: boolean;
}) {
  const klubFindUnique = vi.fn(() => Promise.resolve(opts.klub === undefined ? null : opts.klub));
  const membershipFindUnique = vi.fn(() => Promise.resolve(opts.membership ?? null));
  const requestCreate = vi.fn(() => {
    if (opts.duplicatePending) {
      throw new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: 'test',
      });
    }
    return Promise.resolve({ id: 'req-1', klubId: opts.klub?.id ?? 'k1' });
  });
  const outboxCreate = vi.fn((_args: { data: { eventType: string; payload: unknown } }) =>
    Promise.resolve({}),
  );
  const tx = {
    membershipRequest: { create: requestCreate },
    outboxEvent: { create: outboxCreate },
  };
  const prisma = {
    klub: { findUnique: klubFindUnique },
    membership: { findUnique: membershipFindUnique },
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const handler = new RequestMembershipHandler(prisma as unknown as PrismaService);
  return { handler, requestCreate, outboxCreate };
}

const PRIVATE_KLUB: MockKlub = {
  id: 'klub-1',
  name: 'Tennis Club',
  discovery: { accessMode: 'private' },
  review: { reviewStatus: 'approved' },
  deletedAt: null,
};

describe('RequestMembershipHandler', () => {
  it('cria request pendente em Klub privado', async () => {
    const { handler, requestCreate, outboxCreate } = buildHandler({ klub: PRIVATE_KLUB });
    const result = await handler.execute({
      klubSlug: 'tennis-club',
      userId: 'user-1',
      message: 'Sou sócio nº 12345',
    });
    expect(result).toEqual({ id: 'req-1', klubId: 'klub-1' });
    expect(requestCreate).toHaveBeenCalled();
    const outboxCall = outboxCreate.mock.calls[0]?.[0];
    expect(outboxCall?.data.eventType).toBe('klub.membership_request.created');
  });

  it('rejeita BadRequest quando mensagem < 10 chars', async () => {
    const { handler } = buildHandler({ klub: PRIVATE_KLUB });
    await expect(handler.execute({ klubSlug: 'x', userId: 'u', message: 'curto' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita 404 quando Klub não existe ou pending review', async () => {
    const { handler } = buildHandler({ klub: null });
    await expect(
      handler.execute({ klubSlug: 'x', userId: 'u', message: 'mensagem válida aqui' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita BadRequest quando Klub é público', async () => {
    const { handler } = buildHandler({
      klub: { ...PRIVATE_KLUB, discovery: { accessMode: 'public' } },
    });
    await expect(
      handler.execute({ klubSlug: 'x', userId: 'u', message: 'mensagem válida aqui' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita Conflict quando user já é membro ativo', async () => {
    const { handler } = buildHandler({
      klub: PRIVATE_KLUB,
      membership: { status: 'active' },
    });
    await expect(
      handler.execute({ klubSlug: 'x', userId: 'u', message: 'mensagem válida aqui' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejeita Conflict quando já existe request pendente (P2002)', async () => {
    const { handler } = buildHandler({
      klub: PRIVATE_KLUB,
      duplicatePending: true,
    });
    await expect(
      handler.execute({ klubSlug: 'x', userId: 'u', message: 'mensagem válida aqui' }),
    ).rejects.toThrow(ConflictException);
  });
});
