import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddPlayersToBookingHandler } from './add-players-to-booking.handler';
import type { GuestUserService } from '../../domain/services/guest-user.service';

const BOOKING_ID = '00000000-0000-0000-0002-000000000001';
const PRIMARY_ID = '00000000-0000-0000-0001-000000000aaa';
const NEW_USER_ID = '00000000-0000-0000-0001-000000000bbb';
const OTHER_ID = '00000000-0000-0000-0001-000000000ccc';

function makeBooking(overrides: {
  startsAt?: Date;
  endsAt?: Date | null;
  matchType?: string;
  status?: string;
  bookingType?: string;
  primaryPlayerId?: string | null;
  otherPlayers?: unknown[];
}) {
  return {
    id: BOOKING_ID,
    klubId: 'klub-1',
    startsAt: overrides.startsAt ?? new Date(Date.now() + 24 * 3_600_000),
    endsAt: overrides.endsAt ?? new Date(Date.now() + 25 * 3_600_000),
    status: overrides.status ?? 'confirmed',
    bookingType: overrides.bookingType ?? 'player_match',
    matchType: overrides.matchType ?? 'doubles',
    primaryPlayerId: overrides.primaryPlayerId ?? PRIMARY_ID,
    otherPlayers: overrides.otherPlayers ?? [],
    deletedAt: null,
  };
}

function buildPrisma(
  booking: ReturnType<typeof makeBooking>,
  users: Record<string, { id: string; fullName: string }>,
) {
  return {
    booking: {
      findUnique: vi.fn().mockResolvedValue(booking),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi
        .fn()
        .mockImplementation((args: { data: { otherPlayers: unknown } }) =>
          Promise.resolve({ ...booking, otherPlayers: args.data.otherPlayers }),
        ),
    },
    klub: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'klub-1',
        config: { guestsAddedBy: 'both', accessMode: 'public' },
      }),
    },
    user: {
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve(users[args.where.id] ?? null),
        ),
    },
  };
}

const guestService = {
  createOrGet: vi.fn(),
  search: vi.fn(),
} as unknown as GuestUserService;

describe('AddPlayersToBookingHandler', () => {
  let handler: AddPlayersToBookingHandler;

  beforeEach(() => {
    handler = new AddPlayersToBookingHandler({} as never, guestService);
  });

  it('primary player adiciona um existing user (doubles, 0→1 other)', async () => {
    const booking = makeBooking({ otherPlayers: [] });
    const prisma = buildPrisma(booking, {
      [NEW_USER_ID]: { id: NEW_USER_ID, fullName: 'New Player' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      players: [{ userId: NEW_USER_ID }],
      requestedById: PRIMARY_ID,
      isStaff: false,
    });
    expect(prisma.booking.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.booking.update.mock.calls[0]?.[0] as {
      data: { otherPlayers: { userId: string; name: string }[] };
    };
    expect(updateArg.data.otherPlayers).toEqual([{ userId: NEW_USER_ID, name: 'New Player' }]);
    expect(result.otherPlayers).toHaveLength(1);
  });

  it('non-primary não-staff é bloqueado', async () => {
    const booking = makeBooking({ primaryPlayerId: OTHER_ID });
    const prisma = buildPrisma(booking, {
      [NEW_USER_ID]: { id: NEW_USER_ID, fullName: 'X' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        players: [{ userId: NEW_USER_ID }],
        requestedById: PRIMARY_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/primary player or staff/);
  });

  it('staff adiciona players mesmo sem ser primary', async () => {
    const booking = makeBooking({ primaryPlayerId: OTHER_ID });
    const prisma = buildPrisma(booking, {
      [NEW_USER_ID]: { id: NEW_USER_ID, fullName: 'X' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      players: [{ userId: NEW_USER_ID }],
      requestedById: PRIMARY_ID,
      isStaff: true,
    });
    expect(result).toBeDefined();
  });

  it('bloqueia quando capacidade do matchType é excedida (singles + 2 outros)', async () => {
    const booking = makeBooking({ matchType: 'singles', otherPlayers: [{ userId: OTHER_ID }] });
    const prisma = buildPrisma(booking, {
      [NEW_USER_ID]: { id: NEW_USER_ID, fullName: 'X' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        players: [{ userId: NEW_USER_ID }],
        requestedById: PRIMARY_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/max 2/);
  });

  it('bloqueia duplicata (player já no booking)', async () => {
    const booking = makeBooking({ otherPlayers: [{ userId: NEW_USER_ID }] });
    const prisma = buildPrisma(booking, {
      [NEW_USER_ID]: { id: NEW_USER_ID, fullName: 'X' },
    });
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        players: [{ userId: NEW_USER_ID }],
        requestedById: PRIMARY_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/already in this booking/);
  });

  it('bloqueia booking que já começou', async () => {
    const booking = makeBooking({ startsAt: new Date(Date.now() - 3_600_000) });
    const prisma = buildPrisma(booking, {});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        players: [{ userId: NEW_USER_ID }],
        requestedById: PRIMARY_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/already started/);
  });

  it('bloqueia tournament_match', async () => {
    const booking = makeBooking({ bookingType: 'tournament_match' });
    const prisma = buildPrisma(booking, {});
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        players: [{ userId: NEW_USER_ID }],
        requestedById: PRIMARY_ID,
        isStaff: true,
      }),
    ).rejects.toThrow(/Tournament match/);
  });
});
