import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateKlubSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['sports_club', 'condo', 'school', 'public_space', 'academy', 'individual'])
    .default('sports_club'),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  entityType: z.enum(['pj', 'pf']).optional(),
  document: z.string().optional(),
  legalName: z.string().optional(),
  sportCodes: z.array(
    z.enum(['tennis', 'padel', 'squash', 'beach_tennis'])
  ).default([]),
  parentKlubId: uuidString().optional(),
  isGroup: z.boolean().default(false),
  plan: z.enum(['trial', 'starter', 'pro', 'elite', 'enterprise']).default('trial'),
});

export type CreateKlubDto = z.infer<typeof CreateKlubSchema>;
