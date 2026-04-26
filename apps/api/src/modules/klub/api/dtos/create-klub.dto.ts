import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

/** kebab-case lowercase, alfanum, 2-60 chars. Bate com o que o slugify gera. */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateKlubSchema = z.object({
  name: z.string().min(2).max(100),
  /**
   * Slug opcional. Se omitido, backend gera a partir do `name` (+`city`
   * de fallback). Se enviado, deve respeitar o regex e ser único —
   * conflito retorna 409.
   */
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, 'Slug deve ser kebab-case (lowercase + hífen)')
    .optional(),
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
