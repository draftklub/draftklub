import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApproveBookingHandler } from './approve-booking.handler';

const BOOKING_ID = '00000000-0000-0000-0002-000000000001';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

describe('ApproveBookingHandler', () => {
  let handler: ApproveBookingHandler;

  beforeEach(() => {
    handler = new ApproveBookingHandler({} as never);
  });

  it('aprova booking pendente sem conflito (pending→confirmed)', async () => {
    const booking = {
      id: BOOKING_ID,
      status: 'pending',
      spaceId: 'space-1',
      startsAt: new Date('2026-05-10T10:00:00Z'),
      endsAt: new Date('2026-05-10T11:00:00Z'),
      notes: null,
    };
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ ...booking, status: 'confirmed' }),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    const result = await handler.execute({
      bookingId: BOOKING_ID,
      approvedById: STAFF_ID,
    });
    expect(result.status).toBe('confirmed');
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'confirmed',
          approvedById: STAFF_ID,
        }) as object,
      }),
    );
  });

  it('rejeita aprovação se há conflito novo (criado entre creation e approval)', async () => {
    const booking = {
      id: BOOKING_ID,
      status: 'pending',
      spaceId: 'space-1',
      startsAt: new Date('2026-05-10T10:00:00Z'),
      endsAt: new Date('2026-05-10T11:00:00Z'),
      notes: null,
    };
    const prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn().mockResolvedValue({ id: 'race-b' }),
        update: vi.fn(),
      },
    };
    (handler as unknown as { prisma: unknown }).prisma = prisma;

    await expect(
      handler.execute({ bookingId: BOOKING_ID, approvedById: STAFF_ID }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'space_conflict' }) as object,
    });
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});
