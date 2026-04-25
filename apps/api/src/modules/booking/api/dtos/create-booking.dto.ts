import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateBookingSchema = z
  .object({
    spaceId: uuidString(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
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
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: 'endsAt must be after startsAt',
  });

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
