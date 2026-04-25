import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const WalkoverSchema = z.object({
  winnerId: uuidString(),
  notes: z.string().max(500).optional(),
});

export const DoubleWalkoverSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type WalkoverDto = z.infer<typeof WalkoverSchema>;
export type DoubleWalkoverDto = z.infer<typeof DoubleWalkoverSchema>;
