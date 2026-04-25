import { z } from 'zod';

export const CancelBookingSeriesSchema = z.object({
  mode: z.enum(['this_only', 'this_and_future', 'all']),
  bookingId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export type CancelBookingSeriesDto = z.infer<typeof CancelBookingSeriesSchema>;
