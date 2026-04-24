import { z } from 'zod';

export const AddSportInterestSchema = z.object({
  sportName: z.string().min(2).max(100),
});
export type AddSportInterestDto = z.infer<typeof AddSportInterestSchema>;
