import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const ScheduleConfigSchema = z
  .object({
    availableDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    matchDurationMinutes: z.number().int().min(30).max(360),
    breakBetweenMatchesMinutes: z.number().int().min(0).max(120).default(15),
    spaceIds: z.array(uuidString()).min(1),
    restRuleMinutes: z.number().int().min(0).max(360).default(60),
  })
  .refine((c) => c.endHour > c.startHour, {
    message: 'endHour must be greater than startHour',
  });

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
