import { z } from 'zod';

export const CreateBookingSchema = z
  .object({
    spaceId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    bookingType: z.enum(['player_match', 'player_free_play']).default('player_match'),
    primaryPlayerId: z.string().uuid().optional(),
    otherPlayers: z
      .array(
        z.object({
          userId: z.string().uuid(),
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
