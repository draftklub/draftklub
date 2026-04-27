import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApproveExtensionHandler } from './approve-extension.handler';

const BOOKING_ID = '00000000-0000-0000-0005-000000000001';
const EXT_ID = '11111111-1111-1111-1111-111111111111';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

function bookingWithExtension(extStatus: 'pending' | 'approved' | 'rejected') {
  const endsAt = new Date('2026-05-04T16:00:00Z');
  const newEnd = new Date('2026-05-04T16:30:00Z');
  return {
    id: BOOKING_ID,
    spaceId: 'sp-1',
    endsAt,
    extensions: [
      {
        id: EXT_ID,
        extendedFrom: endsAt.toISOString(),
        extendedTo: newEnd.toISOString(),
        status: extStatus,
      },
    ],
  };
}

describe('ApproveExtensionHandler', () => {
  let handler: ApproveExtensionHandler;

  beforeEach(() => {
    handler = new ApproveExtensionHandler({} as never);
  });

  function attach(prisma: unknown) {
    (handler as unknown as { prisma: unknown }).prisma = prisma;
  }

  it('aprova pending: status->approved e atualiza endsAt', async () => {
    const booking = bookingWithExtension('pending');
    const update = vi
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...booking, ...data }),
      );
    attach({
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
    });
    await handler.execute({ bookingId: BOOKING_ID, extensionId: EXT_ID, approvedById: STAFF_ID });
    const updateCall = update.mock.calls[0]?.[0] as {
      data: { endsAt: Date; extensions: { status: string }[] };
    };
    expect(updateCall.data.endsAt.toISOString()).toBe('2026-05-04T16:30:00.000Z');
    expect(updateCall.data.extensions[0]?.status).toBe('approved');
  });

  it('race condition: outro booking criado entre solicitacao e aprovacao -> 409', async () => {
    const booking = bookingWithExtension('pending');
    attach({
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn().mockResolvedValue({ id: 'other-booking' }),
      },
    });
    await expect(
      handler.execute({ bookingId: BOOKING_ID, extensionId: EXT_ID, approvedById: STAFF_ID }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ type: 'space_conflict' }) as object,
    });
  });

  it('rejeita aprovar extensao que ja foi decidida', async () => {
    const booking = bookingWithExtension('approved');
    attach({
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
      },
    });
    await expect(
      handler.execute({ bookingId: BOOKING_ID, extensionId: EXT_ID, approvedById: STAFF_ID }),
    ).rejects.toThrow(/cannot approve/);
  });
});
