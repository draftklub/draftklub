import { z } from 'zod';

export const EnrollPlayerSchema = z.object({
  userId: z.string().uuid().optional(),
  initialRating: z.number().int().min(0).optional(),
});

export type EnrollPlayerDto = z.infer<typeof EnrollPlayerSchema>;
