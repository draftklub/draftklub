import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RejectExtensionHandler } from './reject-extension.handler';

const BOOKING_ID = '00000000-0000-0000-0005-000000000001';
const EXT_ID = '11111111-1111-1111-1111-111111111111';
const STAFF_ID = '00000000-0000-0000-0001-000000000ccc';

describe('RejectExtensionHandler', () => {
  let handler: RejectExtensionHandler;

  beforeEach(() => {
    handler = new RejectExtensionHandler({} as never);
  });

  it('rejeita pending: status->rejected, endsAt nao muda', async () => {
    const endsAt = new Date('2026-05-04T16:00:00Z');
    const booking = {
      id: BOOKING_ID,
      spaceId: 'sp-1',
      endsAt,
      extensions: [
        {
          id: EXT_ID,
          extendedFrom: endsAt.toISOString(),
          extendedTo: '2026-05-04T16:30:00Z',
          status: 'pending',
        },
      ],
    };
    const update = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...booking, ...data }),
    );
    (handler as unknown as { prisma: unknown }).prisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        update,
      },
    };
    await handler.execute({
      bookingId: BOOKING_ID,
      extensionId: EXT_ID,
      rejectedById: STAFF_ID,
      reason: 'corte de luz',
    });
    const updateCall = update.mock.calls[0]?.[0] as {
      data: { extensions: { status: string; decisionReason?: string }[]; endsAt?: Date };
    };
    expect(updateCall.data.extensions[0]?.status).toBe('rejected');
    expect(updateCall.data.extensions[0]?.decisionReason).toBe('corte de luz');
    expect(updateCall.data.endsAt).toBeUndefined();
  });
});
