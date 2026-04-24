import { z } from 'zod';

export const ReportMatchSchema = z.object({
  winnerId: z.string().uuid(),
  score: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export type ReportMatchDto = z.infer<typeof ReportMatchSchema>;
