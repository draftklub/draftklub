import { z } from 'zod';

export const UpdateRankingSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  includesCasualMatches: z.boolean().optional(),
  includesTournamentMatches: z.boolean().optional(),
  includesTournamentPoints: z.boolean().optional(),
  orderBy: z.enum(['rating', 'tournament_points', 'combined']).optional(),
  combinedWeight: z
    .object({
      ratingWeight: z.number().min(0).max(1),
      pointsWeight: z.number().min(0).max(1),
    })
    .optional(),
  windowType: z
    .enum(['all_time', 'season', 'semester', 'last_weeks', 'last_tournaments'])
    .optional(),
  windowSize: z.number().int().positive().optional(),
  windowStartDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export type UpdateRankingDto = z.infer<typeof UpdateRankingSchema>;
