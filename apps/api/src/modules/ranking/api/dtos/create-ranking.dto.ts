import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateRankingSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['singles', 'doubles', 'mixed']).default('singles'),
  gender: z.enum(['male', 'female', 'undisclosed']).nullable().optional(),
  ageMin: z.number().int().min(0).optional(),
  ageMax: z.number().int().min(0).optional(),
  ratingEngine: z.enum(['elo', 'points', 'win_loss']).optional(),
  ratingConfig: z.record(z.unknown()).default({}),
  initialRating: z.number().int().min(0).max(9999).optional(),
});

export class CreateRankingDto extends createZodDto(CreateRankingSchema) {}
