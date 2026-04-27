import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtendBookingHandler } from './extend-booking.handler';
import { HourBandResolverService } from '../../domain/services/hour-band-resolver.service';

const BOOKING_ID = '00000000-0000-0000-0005-000000000001';
const PLAYER_ID = '00000000-0000-0000-0001-000000000aaa';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

function nowMinusOneHour(): Date {
  return new Date(Date.now() - 3_600_000);
}

interface BookingFixture {
  id: string;
  klubId: string;
  spaceId: string;
  bookingType: string;
  status: string;
  primaryPlayerId: string;
  otherPlayers: { userId: string; name: string }[];
  endsAt: Date;
  extensions: unknown[];
  space: {
    slotGranularityMinutes: number;
    hourBands: unknown[];
  };
  _extensionMode: string;
}

function makeBooking(
  overrides: {
    primaryPlayerId?: string;
    otherPlayers?: { userId: string; name: string }[];
    endsAt?: Date;
    status?: string;
    bookingType?: string;
    extensionMode?: string;
    hourBands?: unknown[];
  } = {},
): BookingFixture {
  const endsAt = overrides.endsAt ?? nowMinusOneHour();
  return {
    id: BOOKING_ID,
    klubId: 'klub-1',
    spaceId: 'sp-1',
    bookingType: overrides.bookingType ?? 'player_match',
    status: overrides.status ?? 'confirmed',
    primaryPlayerId: overrides.primaryPlayerId ?? PLAYER_ID,
    otherPlayers: overrides.otherPlayers ?? [],
    endsAt,
    extensions: [],
    space: {
      slotGranularityMinutes: 30,
      hourBands: overrides.hourBands ?? [],
    },
    _extensionMode: overrides.extensionMode ?? 'player',
  };
}

function makePrisma(booking: BookingFixture, conflict?: { id: string }) {
  return {
    booking: {
      findUnique: vi.fn().mockResolvedValue(booking),
      findFirst: vi.fn().mockResolvedValue(conflict ?? null),
      update: vi
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...booking, ...data }),
        ),
    },
    klub: {
      findUnique: vi.fn().mockResolvedValue({
        config: { extensionMode: booking._extensionMode },
      }),
    },
  };
}

describe('ExtendBookingHandler', () => {
  let handler: ExtendBookingHandler;

  beforeEach(() => {
    handler = new ExtendBookingHandler({} as never, new HourBandResolverService());
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('modo disabled rejeita', async () => {
    const booking = makeBooking({ extensionMode: 'disabled' });
    attach(makePrisma(booking));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 30,
        requestedById: PLAYER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/extension disabled/);
  });

  it('modo player antes de endsAt rejeita', async () => {
    const future = new Date(Date.now() + 3_600_000);
    const booking = makeBooking({ extensionMode: 'player', endsAt: future });
    attach(makePrisma(booking));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 30,
        requestedById: PLAYER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/at or after booking endsAt/);
  });

  it('modo player apos endsAt sem conflito aprova e atualiza endsAt', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'player', endsAt: past });
    const prisma = makePrisma(booking);
    attach(prisma);
    const result = await handler.execute({
      bookingId: BOOKING_ID,
      additionalMinutes: 30,
      requestedById: PLAYER_ID,
      isStaff: false,
    });
    expect(prisma.booking.update).toHaveBeenCalled();
    const updateCall = prisma.booking.update.mock.calls[0]?.[0] as { data: { endsAt: Date } };
    expect(updateCall.data.endsAt.getTime()).toBe(past.getTime() + 30 * 60_000);
    expect(result).toBeDefined();
  });

  it('modo player com conflito de espaço rejeita 409', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'player', endsAt: past });
    attach(makePrisma(booking, { id: 'conflict-1' }));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 30,
        requestedById: PLAYER_ID,
        isStaff: false,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'space_conflict' }) as object,
    });
  });

  it('modo staff_approval por player cria pending sem alterar endsAt', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'staff_approval', endsAt: past });
    const prisma = makePrisma(booking);
    attach(prisma);
    await handler.execute({
      bookingId: BOOKING_ID,
      additionalMinutes: 30,
      requestedById: PLAYER_ID,
      isStaff: false,
    });
    const updateCall = prisma.booking.update.mock.calls[0]?.[0] as {
      data: { endsAt: Date; extensions: { status: string }[] };
    };
    expect(updateCall.data.endsAt.getTime()).toBe(past.getTime());
    expect(updateCall.data.extensions[0]?.status).toBe('pending');
  });

  it('modo staff_only por player rejeita', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'staff_only', endsAt: past });
    attach(makePrisma(booking));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 30,
        requestedById: PLAYER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/only staff to extend/);
  });

  it('modo staff_only por staff aprova', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'staff_only', endsAt: past });
    const prisma = makePrisma(booking);
    attach(prisma);
    await handler.execute({
      bookingId: BOOKING_ID,
      additionalMinutes: 30,
      requestedById: STAFF_ID,
      isStaff: true,
    });
    const updateCall = prisma.booking.update.mock.calls[0]?.[0] as {
      data: { extensions: { status: string }[] };
    };
    expect(updateCall.data.extensions[0]?.status).toBe('approved');
  });

  it('rejeita extensao quebrando granularidade', async () => {
    const past = nowMinusOneHour();
    const booking = makeBooking({ extensionMode: 'player', endsAt: past });
    attach(makePrisma(booking));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 25,
        requestedById: PLAYER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/multiple of 30/);
  });

  it('rejeita quando extensao cruza para banda prime com guests', async () => {
    // endsAt 16:30 (regular), additional 60min -> 17:30 (prime)
    const baseMonday = new Date('2026-05-04T16:30:00Z');
    const bands = [
      {
        type: 'regular',
        startHour: 6,
        endHour: 17,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        durationByMatchType: { singles: 60 },
      },
      {
        type: 'prime',
        startHour: 17,
        endHour: 22,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        durationByMatchType: { singles: 60 },
      },
    ];
    const booking = makeBooking({
      extensionMode: 'staff_approval',
      endsAt: baseMonday,
      otherPlayers: [{ userId: 'u-other', name: 'Outro' }],
      hourBands: bands,
    });
    attach(makePrisma(booking));
    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        additionalMinutes: 60,
        requestedById: STAFF_ID,
        isStaff: true,
      }),
    ).rejects.toThrow(/does not allow guests/);
  });
});
