import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const MoveEntrySchema = z.object({
  targetCategoryId: uuidString(),
  asWildCard: z.boolean().default(false),
});

export type MoveEntryDto = z.infer<typeof MoveEntrySchema>;
