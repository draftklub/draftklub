import { z } from 'zod';

export const CreatePointsSchemaSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  points: z.record(z.number().min(0)).default({}),
});
export type CreatePointsSchemaDto = z.infer<typeof CreatePointsSchemaSchema>;
