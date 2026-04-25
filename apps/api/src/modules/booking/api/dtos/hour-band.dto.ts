import { z } from 'zod';

export const HourBandSchema = z
  .object({
    type: z.enum(['off_peak', 'regular', 'prime']),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1),
    durationByMatchType: z.object({
      singles: z.number().int().min(15).max(360).optional(),
      doubles: z.number().int().min(15).max(360).optional(),
    }),
  })
  .refine((b) => b.endHour > b.startHour, {
    message: 'endHour must be greater than startHour',
  });

export const HourBandsArraySchema = z
  .array(HourBandSchema)
  .max(3)
  .refine(
    (bands) => {
      const types = bands.map((b) => b.type);
      return new Set(types).size === types.length;
    },
    { message: 'Each band type can appear at most once' },
  );

export type HourBandDto = z.infer<typeof HourBandSchema>;
