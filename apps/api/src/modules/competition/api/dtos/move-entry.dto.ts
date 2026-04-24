import { z } from 'zod';

export const MoveEntrySchema = z.object({
  targetCategoryId: z.string().uuid(),
  asWildCard: z.boolean().default(false),
});

export type MoveEntryDto = z.infer<typeof MoveEntrySchema>;
