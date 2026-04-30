import { z } from 'zod';

export const bookingSchema = z.object({
  klubId: z.string().uuid(),
  spaceId: z.string().uuid(),
  startsAt: z.string().min(1),
  matchType: z.enum(['singles', 'doubles']),
  bookingType: z.enum(['player_match', 'player_free_play']).optional(),
  primaryPlayerId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type BookingFormInput = z.infer<typeof bookingSchema>;
