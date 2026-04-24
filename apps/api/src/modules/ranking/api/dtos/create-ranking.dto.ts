import { z } from 'zod';

export const CreateRankingSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['singles', 'doubles', 'mixed']).default('singles'),
  gender: z.enum(['M', 'F']).nullable().optional(),
  ageMin: z.number().int().min(0).optional(),
  ageMax: z.number().int().min(0).optional(),
  ratingEngine: z.enum(['elo', 'points', 'win_loss']).optional(),
  ratingConfig: z.record(z.unknown()).default({}),
  initialRating: z.number().int().min(0).max(9999).optional(),
});

export type CreateRankingDto = z.infer<typeof CreateRankingSchema>;
