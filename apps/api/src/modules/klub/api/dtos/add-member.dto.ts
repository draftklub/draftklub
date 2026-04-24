import { z } from 'zod';

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['member', 'guest', 'staff']).default('member'),
});
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
