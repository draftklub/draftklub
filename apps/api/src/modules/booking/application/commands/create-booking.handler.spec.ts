import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBookingHandler } from './create-booking.handler';
import { HourBandResolverService } from '../../domain/services/hour-band-resolver.service';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const SPACE_ID = '00000000-0000-0000-0001-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';
const PLAYER2_ID = '00000000-0000-0000-0001-000000000bbb';

const REGULAR_BAND = {
  type: 'regular' as const,
  startHour: 6,
  endHour: 17,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  durationByMatchType: { singles: 60, doubles: 90 },
};

const PRIME_BAND = {
  type: 'prime' as const,
  startHour: 17,
  endHour: 22,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  durationByMatchType: { singles: 60 },
};

function nextMonday(hourUTC: number): Date {
  const d = new Date();
  // jump 7-14 days ahead to be safely future
  d.setUTCDate(d.getUTCDate() + 14 + ((1 - d.getUTCDay() + 7) % 7));
  d.setUTCHours(hourUTC, 0, 0, 0);
  return d;
}

interface SpaceOverrides {
  bookingActive?: boolean;
  status?: string;
  klubId?: string;
  slotGranularityMinutes?: number;
  slotDefaultDurationMinutes?: number;
  hourBands?: unknown[];
  allowedMatchTypes?: string[];
}

interface ConfigOverrides {
  bookingModes: string[];
  accessMode: string;
  openingHour: number;
  closingHour: number;
  openDays: string;
  cancellationMode: string;
  cancellationWindowHours: number;
}

function makePrisma(overrides: {
  space?: SpaceOverrides;
  klubConfig?: ConfigOverrides;
  spaceConflict?: { id: string; startsAt: Date; endsAt: Date } | null;
  playerOverlaps?: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    primaryPlayerId: string | null;
    otherPlayers: unknown;
  }[];
  otherOverlaps?: { id: string; otherPlayers: unknown }[];
  isMember?: boolean;
} = {}) {
  const space = {
    bookingActive: overrides.space?.bookingActive ?? true,
    status: overrides.space?.status ?? 'active',
    klubId: overrides.space?.klubId ?? KLUB_ID,
    slotGranularityMinutes: overrides.space?.slotGranularityMinutes ?? 30,
    slotDefaultDurationMinutes: overrides.space?.slotDefaultDurationMinutes ?? 60,
    hourBands: overrides.space?.hourBands ?? [REGULAR_BAND, PRIME_BAND],
    allowedMatchTypes: overrides.space?.allowedMatchTypes ?? ['singles', 'doubles'],
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

  const bookingFindFirst = vi.fn().mockResolvedValueOnce(overrides.spaceConflict ?? null);

  return {
    prisma: {
      space: { findUnique: vi.fn().mockResolvedValue(space) },
      klub: { findUnique: vi.fn().mockResolvedValue({ config }) },
      membership: {
        findFirst: vi
          .fn()
          .mockResolvedValue(overrides.isMember === false ? null : { id: 'm1' }),
      },
      booking: {
        findFirst: bookingFindFirst,
        findMany: vi
          .fn()
          .mockResolvedValueOnce(overrides.playerOverlaps ?? [])
          .mockResolvedValueOnce(overrides.otherOverlaps ?? []),
        create: vi.fn().mockImplementation((args: { data: unknown }) =>
          Promise.resolve({ id: 'new-b', ...(args.data as object) }),
        ),
      },
    },
  };
}

describe('CreateBookingHandler', () => {
  let handler: CreateBookingHandler;
  let resolver: HourBandResolverService;

  const baseCmd = {
    klubId: KLUB_ID,
    spaceId: SPACE_ID,
    startsAt: nextMonday(13),
    matchType: 'singles' as const,
    bookingType: 'player_match' as const,
    primaryPlayerId: USER_ID,
    otherPlayers: [],
    createdById: USER_ID,
    createdByIsStaff: false,
  };

  beforeEach(() => {
    resolver = new HourBandResolverService();
    handler = new CreateBookingHandler({} as never, resolver);
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('cria booking direto quando mode inclui direct', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    const result = await handler.execute({ ...baseCmd });
    expect(result).toMatchObject({ status: 'confirmed', creationMode: 'direct', matchType: 'singles' });
  });

  it('calcula endsAt da banda (singles regular = 60min)', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    const result = await handler.execute({ ...baseCmd });
    const r = result as { startsAt: Date; endsAt: Date };
    expect(r.endsAt.getTime() - r.startsAt.getTime()).toBe(60 * 60_000);
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
    attach(mock.prisma);
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
    attach(mock.prisma);
    await expect(handler.execute({ ...baseCmd })).rejects.toThrow(/staff to create bookings/);
  });

  it('rejeita matchType nao permitido pelo Space', async () => {
    const mock = makePrisma({ space: { allowedMatchTypes: ['singles'] } });
    attach(mock.prisma);
    await expect(
      handler.execute({ ...baseCmd, matchType: 'doubles' }),
    ).rejects.toThrow(/does not allow doubles/);
  });

  it('rejeita doubles em prime band (que so tem singles)', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    await expect(
      handler.execute({ ...baseCmd, startsAt: nextMonday(19), matchType: 'doubles' }),
    ).rejects.toThrow(/does not allow doubles/);
  });

  it('rejeita otherPlayers em banda prime (guests bloqueados)', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    await expect(
      handler.execute({
        ...baseCmd,
        startsAt: nextMonday(19),
        otherPlayers: [{ userId: PLAYER2_ID, name: 'Player 2' }],
      }),
    ).rejects.toThrow(/does not allow guests/);
  });

  it('aceita otherPlayers em banda regular', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    const result = await handler.execute({
      ...baseCmd,
      otherPlayers: [{ userId: PLAYER2_ID, name: 'Player 2' }],
    });
    expect(result).toMatchObject({ status: 'confirmed' });
  });

  it('rejeita com 409 quando ha space conflict', async () => {
    const mock = makePrisma({
      spaceConflict: { id: 'existing-1', startsAt: baseCmd.startsAt, endsAt: new Date(baseCmd.startsAt.getTime() + 60 * 60_000) },
    });
    attach(mock.prisma);
    await expect(handler.execute({ ...baseCmd })).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'space_conflict' }) as object,
    });
  });

  it('rejeita se accessMode=members_only e user nao e membro', async () => {
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
    attach(mock.prisma);
    await expect(handler.execute({ ...baseCmd })).rejects.toThrow(/membership/i);
  });

  it('rejeita se startsAt esta no passado', async () => {
    const mock = makePrisma();
    attach(mock.prisma);
    const past = new Date(Date.now() - 24 * 3_600_000);
    past.setUTCHours(13, 0, 0, 0);
    await expect(
      handler.execute({ ...baseCmd, startsAt: past }),
    ).rejects.toThrow(/past/);
  });
});
