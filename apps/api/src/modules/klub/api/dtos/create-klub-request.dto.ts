import { z } from 'zod';

export const CreateKlubRequestSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['sports_club', 'condo', 'school', 'public_space', 'academy', 'individual'])
    .default('sports_club'),
  city: z.string().min(2).max(100),
  state: z.string().length(2),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  sportCodes: z.array(z.string()).default([]),
  estimatedMembers: z.number().int().positive().optional(),
  message: z.string().max(1000).optional(),
});
export type CreateKlubRequestDto = z.infer<typeof CreateKlubRequestSchema>;
