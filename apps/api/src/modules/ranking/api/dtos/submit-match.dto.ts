import { z } from 'zod';

export const SubmitMatchSchema = z.object({
  rankingId: z.string().uuid(),
  player1Id: z.string().uuid(),
  player2Id: z.string().uuid(),
  winnerId: z.string().uuid(),
  score: z.string().max(50).optional(),
  playedAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  spaceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type SubmitMatchDto = z.infer<typeof SubmitMatchSchema>;
