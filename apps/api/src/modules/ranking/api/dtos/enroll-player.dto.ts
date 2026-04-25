import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const EnrollPlayerSchema = z.object({
  userId: uuidString().optional(),
  initialRating: z.number().int().min(0).optional(),
});

export type EnrollPlayerDto = z.infer<typeof EnrollPlayerSchema>;
