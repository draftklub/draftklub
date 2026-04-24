import { z } from 'zod';

export const WalkoverSchema = z.object({
  winnerId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export const DoubleWalkoverSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type WalkoverDto = z.infer<typeof WalkoverSchema>;
export type DoubleWalkoverDto = z.infer<typeof DoubleWalkoverSchema>;
