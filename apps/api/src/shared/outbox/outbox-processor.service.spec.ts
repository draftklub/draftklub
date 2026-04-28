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
  const update = vi.fn((_args: { where: { id: string }; data: Record<string, unknown> }) =>
    Promise.resolve({}),
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

  const sendMock = vi.fn((_input: { to: string; subject: string; html: string; text: string }) =>
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

interface MockBookingCandidate {
  id: string;
  klubId: string;
  spaceId: string;
  primaryPlayerId: string;
  startsAt: Date;
  endsAt: Date | null;
  matchType: string;
  reminderSentAt?: Date | null;
}

function buildReminderProcessor(opts: { candidates?: MockBookingCandidate[]; raceLost?: boolean }) {
  const candidates = opts.candidates ?? [];
  const findMany = vi.fn((_args: unknown) => Promise.resolve(candidates));
  const updateMany = vi.fn(
    (_args: { where: { id: string; reminderSentAt: null }; data: { reminderSentAt: Date } }) =>
      Promise.resolve({ count: opts.raceLost ? 0 : 1 }),
  );
  const klubFind = vi.fn((_args: unknown) =>
    Promise.resolve({ name: 'Tennis Club', slug: 'tennis-club' }),
  );
  const spaceFind = vi.fn((_args: unknown) => Promise.resolve({ name: 'Quadra 1' }));
  const outboxCreate = vi.fn(
    (args: { data: { eventType: string; payload: Record<string, unknown> } }) =>
      Promise.resolve({ id: 'evt-new', ...args.data }),
  );

  interface ReminderTx {
    booking: { updateMany: typeof updateMany };
    klub: { findUnique: typeof klubFind };
    space: { findUnique: typeof spaceFind };
    outboxEvent: { create: typeof outboxCreate };
  }
  const tx: ReminderTx = {
    booking: { updateMany },
    klub: { findUnique: klubFind },
    space: { findUnique: spaceFind },
    outboxEvent: { create: outboxCreate },
  };

  const prisma = {
    booking: { findMany },
    $transaction: vi.fn((fn: (tx: ReminderTx) => Promise<unknown>) => fn(tx)),
  };

  const config = {
    get: vi.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'APP_BASE_URL') return 'https://draftklub.com';
      return undefined;
    }),
  };
  const email = { send: vi.fn() };

  const processor = new OutboxProcessorService(
    prisma as unknown as PrismaService,
    email as unknown as EmailService,
    config as unknown as ConfigService,
  );
  return { processor, prisma, findMany, updateMany, outboxCreate };
}

describe('OutboxProcessorService — scanRemindersBatch', () => {
  it('pula quando findMany retorna vazio (reminderSentAt filter já no DB)', async () => {
    const { processor, outboxCreate } = buildReminderProcessor({ candidates: [] });
    const result = await processor.scanRemindersBatch();
    expect(result).toEqual({ scheduled: 0 });
    expect(outboxCreate).not.toHaveBeenCalled();
  });

  it('emite OutboxEvent e marca reminderSentAt na mesma tx', async () => {
    const startsAt = new Date(Date.now() + 24 * 3_600_000);
    const { processor, updateMany, outboxCreate } = buildReminderProcessor({
      candidates: [
        {
          id: 'b1',
          klubId: 'k1',
          spaceId: 's1',
          primaryPlayerId: 'u1',
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * 60_000),
          matchType: 'singles',
        },
      ],
    });
    const result = await processor.scanRemindersBatch();
    expect(result).toEqual({ scheduled: 1 });
    expect(updateMany).toHaveBeenCalledTimes(1);
    const updateArg = updateMany.mock.calls[0]?.[0];
    expect(updateArg?.where).toEqual({ id: 'b1', reminderSentAt: null });
    expect(updateArg?.data.reminderSentAt).toBeInstanceOf(Date);
    expect(outboxCreate).toHaveBeenCalledTimes(1);
    const call = outboxCreate.mock.calls[0]?.[0];
    expect(call?.data.eventType).toBe('booking.reminder_24h');
    expect(call?.data.payload.bookingId).toBe('b1');
    expect(call?.data.payload.klubName).toBe('Tennis Club');
    expect(call?.data.payload.spaceName).toBe('Quadra 1');
  });

  it('não emite quando perde corrida (updateMany count=0)', async () => {
    const startsAt = new Date(Date.now() + 24 * 3_600_000);
    const { processor, outboxCreate } = buildReminderProcessor({
      candidates: [
        {
          id: 'b1',
          klubId: 'k1',
          spaceId: 's1',
          primaryPlayerId: 'u1',
          startsAt,
          endsAt: null,
          matchType: 'singles',
        },
      ],
      raceLost: true,
    });
    const result = await processor.scanRemindersBatch();
    expect(result).toEqual({ scheduled: 0 });
    expect(outboxCreate).not.toHaveBeenCalled();
  });
});

interface MockBookingForRecipients {
  primaryPlayerId: string;
  otherPlayers: { userId?: string; guest?: unknown }[];
}

function buildFanoutProcessor(opts: {
  events: MockEvent[];
  booking: MockBookingForRecipients;
  users: { id: string; email: string }[];
  klubAdmins?: { user: { email: string } }[];
}) {
  const queryRaw = vi.fn(() => Promise.resolve(opts.events));
  const executeRaw = vi.fn(() => Promise.resolve(1));
  const update = vi.fn(() => Promise.resolve({}));
  const bookingFindUnique = vi.fn(() => Promise.resolve(opts.booking));
  const userFindMany = vi.fn(() => Promise.resolve(opts.users.map((u) => ({ email: u.email }))));
  const userFindUnique = vi.fn(() => Promise.resolve({ fullName: 'X' }));
  const roleAssignmentFindMany = vi.fn(() => Promise.resolve(opts.klubAdmins ?? []));
  const klubFindUnique = vi.fn(() => Promise.resolve({ slug: 'tennis-club' }));

  const prisma = {
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    booking: { findUnique: bookingFindUnique },
    user: { findMany: userFindMany, findUnique: userFindUnique },
    roleAssignment: { findMany: roleAssignmentFindMany },
    klub: { findUnique: klubFindUnique },
    outboxEvent: { update },
  };

  const sendMock = vi.fn((_input: { to: string; subject: string; html: string; text: string }) =>
    Promise.resolve<SendEmailResult>({ ok: true, id: 'msg-x' }),
  );
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'APP_BASE_URL') return 'https://draftklub.com';
      return undefined;
    }),
  };

  const processor = new OutboxProcessorService(
    prisma as unknown as PrismaService,
    { send: sendMock } as unknown as EmailService,
    config as unknown as ConfigService,
  );
  return { processor, sendMock };
}

describe('OutboxProcessorService — fan-out booking recipients', () => {
  it('booking.created envia pra primary + 2 otherPlayers (3 emails)', async () => {
    const event: MockEvent = {
      id: 'evt-bk',
      event_type: 'booking.created',
      payload: {
        bookingId: 'b1',
        status: 'confirmed',
        klubName: 'Tennis Club',
        klubSlug: 'tennis-club',
        spaceName: 'Quadra 1',
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        endsAt: null,
        matchType: 'singles',
      },
      attempts: 0,
    };
    const { processor, sendMock } = buildFanoutProcessor({
      events: [event],
      booking: {
        primaryPlayerId: 'u1',
        otherPlayers: [{ userId: 'u2' }, { userId: 'u3' }],
      },
      users: [
        { id: 'u1', email: 'p1@x.com' },
        { id: 'u2', email: 'p2@x.com' },
        { id: 'u3', email: 'p3@x.com' },
      ],
    });
    await processor.processBatch();
    expect(sendMock).toHaveBeenCalledTimes(3);
    const tos = sendMock.mock.calls.map((c) => c[0].to).sort();
    expect(tos).toEqual(['p1@x.com', 'p2@x.com', 'p3@x.com']);
  });

  it('ignora guests sem userId (só primary fica)', async () => {
    const event: MockEvent = {
      id: 'evt-bk2',
      event_type: 'booking.created',
      payload: {
        bookingId: 'b2',
        status: 'confirmed',
        klubName: 'Tennis Club',
        klubSlug: 'tennis-club',
        spaceName: 'Quadra 1',
        startsAt: new Date().toISOString(),
        endsAt: null,
        matchType: 'singles',
      },
      attempts: 0,
    };
    const { processor, sendMock } = buildFanoutProcessor({
      events: [event],
      booking: {
        primaryPlayerId: 'u1',
        otherPlayers: [{ guest: { name: 'Visitante' } }],
      },
      users: [{ id: 'u1', email: 'p1@x.com' }],
    });
    await processor.processBatch();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
