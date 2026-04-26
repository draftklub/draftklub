import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelBookingHandler } from './cancel-booking.handler';

const BOOKING_ID = '00000000-0000-0000-0002-000000000001';
const USER_ID = '00000000-0000-0000-0001-000000000aaa';
const OTHER_USER_ID = '00000000-0000-0000-0001-000000000bbb';

function makeBooking(overrides: {
  startsAt: Date;
  primaryPlayerId: string | null;
  otherPlayers: unknown;
  status?: string;
  bookingType?: string;
}) {
  return {
    id: BOOKING_ID,
    klubId: 'klub-1',
    startsAt: overrides.startsAt,
    primaryPlayerId: overrides.primaryPlayerId,
    otherPlayers: overrides.otherPlayers,
    status: overrides.status ?? 'confirmed',
    bookingType: overrides.bookingType ?? 'player_match',
  };
}

function makeKlub(cancellationMode: string, cancellationWindowHours = 24) {
  return { config: { cancellationMode, cancellationWindowHours } };
}

function buildPrisma(booking: ReturnType<typeof makeBooking>, klub: ReturnType<typeof makeKlub>) {
  return {
    booking: {
      findUnique: vi.fn().mockResolvedValue(booking),
      update: vi.fn().mockResolvedValue({ ...booking, status: 'cancelled' }),
    },
    klub: { findUnique: vi.fn().mockResolvedValue(klub) },
  };
}

describe('CancelBookingHandler', () => {
  let handler: CancelBookingHandler;

  beforeEach(() => {
    handler = new CancelBookingHandler({} as never);
  });

  it('participant cancela quando mode=free (sem deadline check)', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 48 * 3_600_000),
      primaryPlayerId: USER_ID,
      otherPlayers: [],
    });
    const prisma = buildPrisma(booking, makeKlub('free'));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      cancelledById: USER_ID,
      isStaff: false,
    });
    expect(result.status).toBe('cancelled');
  });

  it('non-participant é bloqueado', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 48 * 3_600_000),
      primaryPlayerId: OTHER_USER_ID,
      otherPlayers: [],
    });
    const prisma = buildPrisma(booking, makeKlub('free'));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ bookingId: BOOKING_ID, cancelledById: USER_ID, isStaff: false }),
    ).rejects.toThrow(/participants or staff/);
  });

  it('bloqueado quando mode=with_deadline e prazo passou', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 2 * 3_600_000),
      primaryPlayerId: USER_ID,
      otherPlayers: [],
    });
    const prisma = buildPrisma(booking, makeKlub('with_deadline', 24));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ bookingId: BOOKING_ID, cancelledById: USER_ID, isStaff: false }),
    ).rejects.toThrow(/deadline/);
  });

  it('staff sempre pode cancelar (ignora deadline e cancellationMode)', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 1 * 3_600_000),
      primaryPlayerId: OTHER_USER_ID,
      otherPlayers: [],
    });
    const prisma = buildPrisma(booking, makeKlub('staff_only', 24));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      cancelledById: USER_ID,
      isStaff: true,
    });
    expect(result.status).toBe('cancelled');
  });

  it('player NAO pode cancelar tournament_match (10D)', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 48 * 3_600_000),
      primaryPlayerId: USER_ID,
      otherPlayers: [],
      bookingType: 'tournament_match',
    });
    const prisma = buildPrisma(booking, makeKlub('free'));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({
        bookingId: BOOKING_ID,
        cancelledById: USER_ID,
        isStaff: false,
      }),
    ).rejects.toThrow(/Tournament match bookings cannot be cancelled directly/);
  });

  it('staff PODE cancelar tournament_match (10D)', async () => {
    const booking = makeBooking({
      startsAt: new Date(Date.now() + 48 * 3_600_000),
      primaryPlayerId: USER_ID,
      otherPlayers: [],
      bookingType: 'tournament_match',
    });
    const prisma = buildPrisma(booking, makeKlub('free'));
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      cancelledById: OTHER_USER_ID,
      isStaff: true,
    });
    expect(result.status).toBe('cancelled');
  });
});
