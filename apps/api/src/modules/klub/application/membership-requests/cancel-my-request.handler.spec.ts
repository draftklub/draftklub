import { describe, it, expect, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CancelMyRequestHandler } from './cancel-my-request.handler';
import type { PrismaService } from '../../../../shared/prisma/prisma.service';

function buildHandler(req: { id: string; userId: string; status: string } | null) {
  const update = vi.fn(() => Promise.resolve({}));
  const prisma = {
    membershipRequest: {
      findUnique: vi.fn(() => Promise.resolve(req)),
      update,
    },
  };
  const handler = new CancelMyRequestHandler(prisma as unknown as PrismaService);
  return { handler, update };
}

describe('CancelMyRequestHandler', () => {
  it('cancela request pendente do próprio user', async () => {
    const { handler, update } = buildHandler({
      id: 'r-1',
      userId: 'u-1',
      status: 'pending',
    });
    await handler.execute({ requestId: 'r-1', userId: 'u-1' });
    expect(update).toHaveBeenCalled();
  });

  it('rejeita Forbidden quando user não é dono', async () => {
    const { handler } = buildHandler({ id: 'r-1', userId: 'OUTRO', status: 'pending' });
    await expect(
      handler.execute({ requestId: 'r-1', userId: 'u-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejeita BadRequest quando já decidido', async () => {
    const { handler } = buildHandler({ id: 'r-1', userId: 'u-1', status: 'approved' });
    await expect(
      handler.execute({ requestId: 'r-1', userId: 'u-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita 404 quando não existe', async () => {
    const { handler } = buildHandler(null);
    await expect(
      handler.execute({ requestId: 'r-1', userId: 'u-1' }),
    ).rejects.toThrow(NotFoundException);
  });
});
