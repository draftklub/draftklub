import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CancelBookingSeriesSchema = z.object({
  mode: z.enum(['this_only', 'this_and_future', 'all']),
  bookingId: uuidString().optional(),
  reason: z.string().max(500).optional(),
});

export type CancelBookingSeriesDto = z.infer<typeof CancelBookingSeriesSchema>;
