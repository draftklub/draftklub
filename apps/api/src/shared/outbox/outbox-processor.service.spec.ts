import { describe, it, expect, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { OutboxProcessorService } from './outbox-processor.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService, SendEmailResult } from '../email/email.service';

interface MockEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

function buildProcessor(opts: {
  events?: MockEvent[];
  userEmail?: string | null;
  sendResult?: SendEmailResult;
}) {
  const queryRaw = vi.fn(() => Promise.resolve(opts.events ?? []));
  const executeRaw = vi.fn(() => Promise.resolve(1));
  const update = vi.fn(
    (_args: { where: { id: string }; data: Record<string, unknown> }) => Promise.resolve({}),
  );
  const findUnique = vi.fn((_args: { where: { id: string } }) =>
    Promise.resolve(
      opts.userEmail === null ? null : { email: opts.userEmail ?? 'creator@klub.com' },
    ),
  );

  const prisma = {
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    user: { findUnique },
    outboxEvent: { update },
  };

  const sendMock = vi.fn(
    (_input: { to: string; subject: string; html: string; text: string }) =>
      Promise.resolve<SendEmailResult>(opts.sendResult ?? { ok: true, id: 'msg-1' }),
  );
  const email = { send: sendMock };

  const config = {
    get: vi.fn((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'APP_BASE_URL') return 'https://draftklub.com';
      return undefined;
    }),
  };

  const processor = new OutboxProcessorService(
    prisma as unknown as PrismaService,
    email as unknown as EmailService,
    config as unknown as ConfigService,
  );
  return { processor, prisma, email, sendMock, update, executeRaw, findUnique };
}

const APPROVED_EVENT: MockEvent = {
  id: 'evt-1',
  event_type: 'klub.review.approved',
  payload: {
    klubId: 'k1',
    klubName: 'Tennis Club',
    klubSlug: 'tennis-club',
    createdById: 'user-1',
    decidedById: 'admin-1',
  },
  attempts: 0,
};

const REJECTED_EVENT: MockEvent = {
  id: 'evt-2',
  event_type: 'klub.review.rejected',
  payload: {
    klubId: 'k2',
    klubName: 'Padel SP',
    createdById: 'user-2',
    decidedById: 'admin-1',
    reason: 'CNPJ inválido na Receita',
  },
  attempts: 0,
};

describe('OutboxProcessorService', () => {
  it('envia email approved e marca sent', async () => {
    const { processor, sendMock, update } = buildProcessor({ events: [APPROVED_EVENT] });
    const result = await processor.processBatch();
    expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendArg = sendMock.mock.calls[0]?.[0];
    expect(sendArg?.to).toBe('creator@klub.com');
    expect(sendArg?.subject).toContain('Tennis Club');
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.where.id).toBe('evt-1');
    expect(updateCall?.data.status).toBe('sent');
  });

  it('envia email rejected com motivo', async () => {
    const { processor, sendMock } = buildProcessor({ events: [REJECTED_EVENT] });
    await processor.processBatch();
    const sendArg = sendMock.mock.calls[0]?.[0];
    expect(sendArg?.subject).toContain('Padel SP');
    expect(sendArg?.text).toContain('CNPJ inválido na Receita');
  });

  it('marca dead quando criador não tem email', async () => {
    const { processor, update, sendMock } = buildProcessor({
      events: [APPROVED_EVENT],
      userEmail: null,
    });
    await processor.processBatch();
    expect(sendMock).not.toHaveBeenCalled();
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.where.id).toBe('evt-1');
    expect(updateCall?.data.status).toBe('dead');
  });

  it('marca retry pendente em falha 5xx (retryable)', async () => {
    const { processor, executeRaw } = buildProcessor({
      events: [APPROVED_EVENT],
      sendResult: { ok: false, error: 'upstream', retryable: true },
    });
    const result = await processor.processBatch();
    expect(result).toEqual({ processed: 1, sent: 0, failed: 1 });
    expect(executeRaw).toHaveBeenCalled();
  });

  it('marca dead direto em falha 4xx (não retryable)', async () => {
    const { processor, update } = buildProcessor({
      events: [APPROVED_EVENT],
      sendResult: { ok: false, error: 'invalid email', retryable: false },
    });
    await processor.processBatch();
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.where.id).toBe('evt-1');
    expect(updateCall?.data.status).toBe('dead');
  });

  it('processa batch vazio sem efeitos', async () => {
    const { processor, sendMock } = buildProcessor({ events: [] });
    const result = await processor.processBatch();
    expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
