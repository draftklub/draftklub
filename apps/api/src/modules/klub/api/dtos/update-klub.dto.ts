import { z } from 'zod';

const KlubTypeEnum = z.enum([
  'sports_club',
  'arena',
  'academy',
  'condo',
  'hotel_resort',
  'university',
  'school',
  'public_space',
  'individual',
]);

const PlanEnum = z.enum(['trial', 'starter', 'pro', 'elite', 'enterprise']);
const StatusEnum = z.enum(['trial', 'active', 'suspended', 'churned', 'pending_payment']);

export const UpdateKlubSchema = z
  .object({
    // KLUB_ADMIN ou SUPER_ADMIN podem editar:
    name: z.string().min(2).max(100).optional(),
    /** Sprint Polish PR-G — nome popular/colloquial. */
    commonName: z.string().max(100).nullable().optional(),
    /** Sprint Polish PR-G — abreviação curta pra UI compacta. */
    abbreviation: z.string().max(10).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    type: KlubTypeEnum.optional(),
    avatarUrl: z.string().url().nullable().optional(),
    coverUrl: z.string().url().nullable().optional(),

    email: z.string().email().nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    website: z.string().url().nullable().optional(),

    cep: z
      .string()
      .length(8)
      .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')
      .nullable()
      .optional(),
    addressStreet: z.string().max(200).nullable().optional(),
    addressNumber: z.string().max(20).nullable().optional(),
    addressComplement: z.string().max(100).nullable().optional(),
    addressNeighborhood: z.string().max(100).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    state: z.string().length(2).nullable().optional(),
    addressSource: z.enum(['cnpj_lookup', 'manual']).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),

    discoverable: z.boolean().optional(),
    accessMode: z.enum(['public', 'private']).optional(),

    amenities: z.record(z.unknown()).optional(),

    // SUPER_ADMIN-only — handler valida e rejeita se KLUB_ADMIN tentar:
    legalName: z.string().max(200).nullable().optional(),
    plan: PlanEnum.optional(),
    status: StatusEnum.optional(),
    maxMembers: z.number().int().min(1).max(10000).optional(),
    maxSports: z.number().int().min(1).max(20).optional(),
    maxCourts: z.number().int().min(1).max(100).optional(),

    /** Sprint Polish PR-G — slug é SUPER_ADMIN-only por romper URLs/cookies. */
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'slug só aceita lowercase, dígitos e hífen')
      .optional(),
    /** Sprint Polish PR-G — CNPJ é SUPER_ADMIN-only por mexer em KYC. */
    document: z
      .string()
      .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Patch vazio' });

export type UpdateKlubDto = z.infer<typeof UpdateKlubSchema>;

export const DeactivateKlubSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type DeactivateKlubDto = z.infer<typeof DeactivateKlubSchema>;
