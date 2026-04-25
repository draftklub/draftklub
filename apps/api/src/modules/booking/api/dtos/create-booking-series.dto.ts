import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateBookingSeriesSchema = z
  .object({
    spaceId: uuidString(),
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    interval: z.number().int().min(1).max(12).default(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    startsOn: z.string().datetime(),
    endsOn: z.string().datetime(),
    startHour: z.number().int().min(0).max(23),
    startMinute: z.number().int().min(0).max(59).default(0),
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
  })
  .refine((data) => new Date(data.endsOn) > new Date(data.startsOn), {
    message: 'endsOn must be after startsOn',
  });

export type CreateBookingSeriesDto = z.infer<typeof CreateBookingSeriesSchema>;
