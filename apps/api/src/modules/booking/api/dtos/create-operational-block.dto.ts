import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateOperationalBlockSchema = z
  .object({
    spaceId: uuidString(),
    blockType: z.enum(['maintenance', 'weather_closed', 'staff_blocked']),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    reason: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
    recurrence: z
      .object({
        frequency: z.enum(['weekly', 'biweekly', 'monthly']),
        interval: z.number().int().min(1).max(12).default(1),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
        endsOn: z.string().datetime(),
        durationMinutes: z.number().int().min(15).max(360),
      })
      .optional(),
  })
  .refine((d) => !d.endsAt || new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'endsAt must be after startsAt when provided',
  });

export const CloseOperationalBlockSchema = z.object({
  endsAt: z.string().datetime().optional(),
});

export type CreateOperationalBlockDto = z.infer<typeof CreateOperationalBlockSchema>;
export type CloseOperationalBlockDto = z.infer<typeof CloseOperationalBlockSchema>;
