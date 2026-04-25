import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const AddMemberSchema = z.object({
  userId: uuidString(),
  type: z.enum(['member', 'guest', 'staff']).default('member'),
});
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
