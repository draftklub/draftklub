import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateBookingSchema = z.object({
  spaceId: uuidString(),
  startsAt: z.string().datetime(),
  matchType: z.enum(['singles', 'doubles']),
  bookingType: z.enum(['player_match', 'player_free_play']).default('player_match'),
  primaryPlayerId: uuidString().optional(),
  otherPlayers: z
    .array(
      z.object({
        userId: uuidString(),
        name: z.string().min(1).max(120),
      }),
    )
    .default([]),
  notes: z.string().max(500).optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
