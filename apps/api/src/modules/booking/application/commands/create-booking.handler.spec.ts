import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBookingHandler } from './create-booking.handler';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SPACE_ID = '00000000-0000-0000-0001-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';
const PLAYER2_ID = '00000000-0000-0000-0001-000000000bbb';

function futureMonday10h(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((1 - d.getUTCDay() + 7) % 7 || 7));
  d.setUTCHours(10, 0, 0, 0);
  return d;
}

function makePrisma(overrides: Partial<{
  space: { bookingActive: boolean; status: string; klubId: string; slotGranularityMinutes: number } | null;
  klubConfig: {
    bookingModes: string[];
    accessMode: string;
    openingHour: number;
    closingHour: number;
    openDays: string;
    cancellationMode: string;
    cancellationWindowHours: number;
  };
  spaceConflict: { id: string; startsAt: Date; endsAt: Date } | null;
  playerOverlaps: { id: string; startsAt: Date; endsAt: Date; primaryPlayerId: string | null; otherPlayers: unknown }[];
  otherOverlaps: { id: string; otherPlayers: unknown }[];
  isMember: boolean;
}> = {}) {
  const space = overrides.space ?? {
    bookingActive: true,
    status: 'active',
    klubId: KLUB_ID,
    slotGranularityMinutes: 30,
  };
  const config = overrides.klubConfig ?? {
    bookingModes: ['direct'],
    accessMode: 'public',
    openingHour: 6,
    closingHour: 23,
    openDays: '1,2,3,4,5,6,7',
    cancellationMode: 'with_deadline',
    cancellationWindowHours: 24,
  };

  const bookingFindFirst = vi
    .fn()
    .mockResolvedValueOnce(overrides.spaceConflict ?? null); // space conflict query

  return {
    prisma: {
      space: { findUnique: vi.fn().mockResolvedValue(space) },
      klub: { findUnique: vi.fn().mockResolvedValue({ config }) },
      membership: { findFirst: vi.fn().mockResolvedValue(overrides.isMember === false ? null : { id: 'm1' }) },
      booking: {
        findFirst: bookingFindFirst,
        findMany: vi
          .fn()
          .mockResolvedValueOnce(overrides.playerOverlaps ?? [])
          .mockResolvedValueOnce(overrides.otherOverlaps ?? []),
        create: vi.fn().mockImplementation((args: { data: unknown }) => Promise.resolve({ id: 'new-b', ...(args.data as object) })),
      },
    },
  };
}

describe('CreateBookingHandler', () => {
  let handler: CreateBookingHandler;

  const baseCmd = {
    klubId: KLUB_ID,
    spaceId: SPACE_ID,
    startsAt: futureMonday10h(),
    endsAt: new Date(futureMonday10h().getTime() + 60 * 60_000),
    bookingType: 'player_match' as const,
    primaryPlayerId: USER_ID,
    otherPlayers: [],
    createdById: USER_ID,
    createdByIsStaff: false,
  };

  beforeEach(() => {
    handler = new CreateBookingHandler({} as never);
  });

  it('cria booking direto quando mode inclui direct', async () => {
    const mock = makePrisma();
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    const result = await handler.execute({ ...baseCmd });
    expect(result).toMatchObject({ status: 'confirmed', creationMode: 'direct' });
  });

  it('cria booking pendente quando mode é staff_approval (sem direct)', async () => {
    const mock = makePrisma({
      klubConfig: {
        bookingModes: ['staff_approval'],
        accessMode: 'public',
        openingHour: 6,
        closingHour: 23,
        openDays: '1,2,3,4,5,6,7',
        cancellationMode: 'with_deadline',
        cancellationWindowHours: 24,
      },
    });
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    const result = await handler.execute({ ...baseCmd });
    expect(result).toMatchObject({ status: 'pending', creationMode: 'staff_approval' });
  });

  it('rejeita player quando modo é staff_only', async () => {
    const mock = makePrisma({
      klubConfig: {
        bookingModes: ['staff_only'],
        accessMode: 'public',
        openingHour: 6,
        closingHour: 23,
        openDays: '1,2,3,4,5,6,7',
        cancellationMode: 'with_deadline',
        cancellationWindowHours: 24,
      },
    });
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    await expect(handler.execute({ ...baseCmd })).rejects.toThrow(/staff to create bookings/);
  });

  it('rejeita com 409 quando há space conflict', async () => {
    const mock = makePrisma({
      spaceConflict: { id: 'existing-1', startsAt: baseCmd.startsAt, endsAt: baseCmd.endsAt },
    });
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    await expect(handler.execute({ ...baseCmd })).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'space_conflict' }) as object,
    });
  });

  it('rejeita com 409 quando primaryPlayer tem conflict', async () => {
    const mock = makePrisma({
      playerOverlaps: [
        {
          id: 'other-1',
          startsAt: baseCmd.startsAt,
          endsAt: baseCmd.endsAt,
          primaryPlayerId: USER_ID,
          otherPlayers: [],
        },
      ],
    });
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    await expect(
      handler.execute({
        ...baseCmd,
        otherPlayers: [{ userId: PLAYER2_ID, name: 'Player 2' }],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'player_conflict' }) as object,
    });
  });

  it('rejeita se startsAt está no passado', async () => {
    const mock = makePrisma();
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    const past = new Date(Date.now() - 24 * 3_600_000);
    past.setUTCHours(10, 0, 0, 0);
    await expect(
      handler.execute({
        ...baseCmd,
        startsAt: past,
        endsAt: new Date(past.getTime() + 60 * 60_000),
      }),
    ).rejects.toThrow(/past/);
  });

  it('rejeita se accessMode=members_only e user não é membro', async () => {
    const mock = makePrisma({
      klubConfig: {
        bookingModes: ['direct'],
        accessMode: 'members_only',
        openingHour: 6,
        closingHour: 23,
        openDays: '1,2,3,4,5,6,7',
        cancellationMode: 'with_deadline',
        cancellationWindowHours: 24,
      },
      isMember: false,
    });
    (handler as unknown as { prisma: unknown }).prisma = mock.prisma;

    await expect(handler.execute({ ...baseCmd })).rejects.toThrow(/membership/i);
  });
});
