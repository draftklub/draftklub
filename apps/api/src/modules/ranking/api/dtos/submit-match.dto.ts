import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const SubmitMatchSchema = z.object({
  rankingId: uuidString(),
  player1Id: uuidString(),
  player2Id: uuidString(),
  winnerId: uuidString(),
  score: z.string().max(50).optional(),
  playedAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  spaceId: uuidString().optional(),
  notes: z.string().max(500).optional(),
});

export type SubmitMatchDto = z.infer<typeof SubmitMatchSchema>;
