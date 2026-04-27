import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RequestEnrollmentHandler,
  ApproveEnrollmentHandler,
  CreateEnrollmentDirectHandler,
  SuspendEnrollmentHandler,
} from './enrollment.handlers';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SPORT_CODE = 'tennis';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';
const PROFILE_ID = '00000000-0000-0000-0010-000000000001';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';
const ENROLLMENT_ID = '00000000-0000-0000-0030-000000000001';

function buildPrisma(
  opts: {
    profile?: { id: string; status: string } | null;
    membership?: { id: string } | null;
    existingEnrollment?: { id: string; status: string } | null;
  } = {},
) {
  return {
    klubSportProfile: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          opts.profile === null ? null : (opts.profile ?? { id: PROFILE_ID, status: 'active' }),
        ),
    },
    membership: {
      findFirst: vi
        .fn()
        .mockResolvedValue(opts.membership === null ? null : (opts.membership ?? { id: 'm-1' })),
    },
    playerSportEnrollment: {
      findUnique: vi.fn().mockResolvedValue(opts.existingEnrollment ?? null),
      create: vi
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'enroll-new', ...args.data }),
        ),
      update: vi
        .fn()
        .mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
        ),
    },
  };
}

describe('RequestEnrollmentHandler', () => {
  let handler: RequestEnrollmentHandler;

  beforeEach(() => {
    handler = new RequestEnrollmentHandler({} as never);
  });

  it('cria enrollment pending para member ativo do Klub', async () => {
    const prisma = buildPrisma();
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const r = await handler.execute({ userId: USER_ID, klubId: KLUB_ID, sportCode: SPORT_CODE });
    const created = r as { status: string; userId: string };
    expect(created.status).toBe('pending');
    expect(prisma.playerSportEnrollment.create).toHaveBeenCalledOnce();
  });

  it('rejeita se ja tem enrollment active', async () => {
    const prisma = buildPrisma({
      existingEnrollment: { id: ENROLLMENT_ID, status: 'active' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ userId: USER_ID, klubId: KLUB_ID, sportCode: SPORT_CODE }),
    ).rejects.toThrow(/already exists/);
  });

  it('rejeita se user nao eh membro do Klub', async () => {
    const prisma = buildPrisma({ membership: null });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ userId: USER_ID, klubId: KLUB_ID, sportCode: SPORT_CODE }),
    ).rejects.toThrow(/active member/);
  });
});

describe('ApproveEnrollmentHandler', () => {
  let handler: ApproveEnrollmentHandler;

  beforeEach(() => {
    handler = new ApproveEnrollmentHandler({} as never);
  });

  it('aprova pending -> active', async () => {
    const prisma = buildPrisma({
      existingEnrollment: { id: ENROLLMENT_ID, status: 'pending' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute({ enrollmentId: ENROLLMENT_ID, approvedById: STAFF_ID });
    const updateCall = prisma.playerSportEnrollment.update.mock.calls[0]?.[0] as {
      data: { status: string; approvedById: string };
    };
    expect(updateCall.data.status).toBe('active');
    expect(updateCall.data.approvedById).toBe(STAFF_ID);
  });

  it('rejeita se status != pending', async () => {
    const prisma = buildPrisma({
      existingEnrollment: { id: ENROLLMENT_ID, status: 'active' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ enrollmentId: ENROLLMENT_ID, approvedById: STAFF_ID }),
    ).rejects.toThrow(/cannot approve/);
  });
});

describe('CreateEnrollmentDirectHandler', () => {
  let handler: CreateEnrollmentDirectHandler;

  beforeEach(() => {
    handler = new CreateEnrollmentDirectHandler({} as never);
  });

  it('cria direto active (skip pending)', async () => {
    const prisma = buildPrisma();
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const r = await handler.execute({
      userId: USER_ID,
      klubId: KLUB_ID,
      sportCode: SPORT_CODE,
      approvedById: STAFF_ID,
    });
    const created = r as { status: string };
    expect(created.status).toBe('active');
    expect(prisma.playerSportEnrollment.create).toHaveBeenCalledOnce();
  });

  it('rejeita se user nao eh member do Klub', async () => {
    const prisma = buildPrisma({ membership: null });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        userId: USER_ID,
        klubId: KLUB_ID,
        sportCode: SPORT_CODE,
        approvedById: STAFF_ID,
      }),
    ).rejects.toThrow(/active member/);
  });
});

describe('SuspendEnrollmentHandler', () => {
  it('active -> suspended', async () => {
    const handler = new SuspendEnrollmentHandler({} as never);
    const prisma = buildPrisma({
      existingEnrollment: { id: ENROLLMENT_ID, status: 'active' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await handler.execute({
      enrollmentId: ENROLLMENT_ID,
      suspendedById: STAFF_ID,
      reason: 'no-show',
    });
    const updateCall = prisma.playerSportEnrollment.update.mock.calls[0]?.[0] as {
      data: { status: string; suspensionReason: string };
    };
    expect(updateCall.data.status).toBe('suspended');
    expect(updateCall.data.suspensionReason).toBe('no-show');
  });
});
