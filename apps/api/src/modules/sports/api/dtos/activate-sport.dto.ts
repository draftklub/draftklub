import { z } from 'zod';

export const ActivateSportSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  defaultRatingEngine: z.enum(['elo', 'points', 'win_loss']).default('elo'),
  defaultRatingConfig: z.record(z.unknown()).default({}),
  defaultInitialRating: z.number().int().min(0).max(9999).default(1000),
});

export type ActivateSportDto = z.infer<typeof ActivateSportSchema>;
