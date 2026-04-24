import { z } from 'zod';

export const AddMediaSchema = z.object({
  type: z.enum(['photo', 'video', 'cover', 'logo']),
  url: z.string().url(),
  caption: z.string().max(200).optional(),
  order: z.number().int().min(0).default(0),
});
export type AddMediaDto = z.infer<typeof AddMediaSchema>;
