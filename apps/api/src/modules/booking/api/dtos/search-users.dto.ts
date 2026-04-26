import { z } from 'zod';

export const SearchUsersSchema = z.object({
  query: z.string().min(2).max(100),
  limit: z.number().int().min(1).max(20).default(10),
});

export type SearchUsersDto = z.infer<typeof SearchUsersSchema>;
