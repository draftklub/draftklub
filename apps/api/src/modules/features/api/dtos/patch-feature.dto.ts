import { z } from 'zod';

export const PatchFeatureSchema = z.object({
  tier: z.enum(['free', 'premium', 'disabled']).optional(),
  enabled: z.boolean().optional(),
});

export type PatchFeatureDto = z.infer<typeof PatchFeatureSchema>;
