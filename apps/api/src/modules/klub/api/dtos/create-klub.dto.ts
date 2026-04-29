import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

/**
 * Sprint D PR1 — `entityType` virou obrigatório, `slug` removido (gerado
 * server-side a partir de name + neighborhood + city), e `creatorCpf`
 * habilita o flow PF salvando o CPF no User do criador.
 *
 * Fluxo:
 * - PJ → exige `document` (CNPJ válido). Backend faz lookup BrasilAPI.
 * - PF → exige `creatorCpf` válido. Backend upsert em User.documentNumber.
 *
 * Cadastro entra com `reviewStatus='pending'` — Klub fica oculto até
 * SUPER_ADMIN aprovar (PR2 ativa a UI admin).
 */
export const CreateKlubSchema = z
  .object({
    name: z.string().min(2).max(100),
    /** Sprint Polish PR-G: nome popular/colloquial. */
    commonName: z.string().max(100).optional(),
    /** Sprint Polish PR-G: abreviação curta pra UI compacta. */
    abbreviation: z.string().max(10).optional(),
    type: z
      .enum([
        'sports_club',
        'arena',
        'academy',
        'condo',
        'hotel_resort',
        'university',
        'school',
        'public_space',
        'individual',
      ])
      .default('sports_club'),
    timezone: z.string().default('America/Sao_Paulo'),
    email: z.string().email().optional(),
    phone: z.string().optional(),

    // Identidade legal — obrigatória.
    entityType: z.enum(['pj', 'pf']),
    /** CNPJ só dígitos, 14 chars. Obrigatório quando entityType='pj'. */
    document: z
      .string()
      .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
      .optional(),
    /**
     * CPF só dígitos, 11 chars. Obrigatório quando entityType='pf' e
     * `User.documentNumber` ainda é null. Se já está no perfil, pode
     * omitir (handler resolve usando o do User).
     */
    creatorCpf: z
      .string()
      .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
      .optional(),
    legalName: z.string().optional(),

    // Endereço granular.
    cep: z
      .string()
      .length(8)
      .regex(/^\d{8}$/, 'CEP deve ter 8 dígitos')
      .optional(),
    addressStreet: z.string().max(200).optional(),
    addressNumber: z.string().max(20).optional(),
    addressComplement: z.string().max(100).optional(),
    addressNeighborhood: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2).optional(),
    addressSource: z.enum(['cnpj_lookup', 'manual']).optional(),

    // Modalidades.
    sportCodes: z.array(z.enum(['tennis', 'padel', 'squash', 'beach_tennis'])).default([]),

    // Filiais (não usado pelo /criar-klub web, mantido pro seed/admin).
    parentKlubId: uuidString().optional(),
    isGroup: z.boolean().default(false),
    plan: z.enum(['trial', 'starter', 'pro', 'elite', 'enterprise']).default('trial'),

    // Visibilidade & acesso.
    discoverable: z.boolean().default(false),
    accessMode: z.enum(['public', 'private']).default('public'),
  })
  .refine((d) => d.entityType !== 'pj' || d.document?.length === 14, {
    message: 'CNPJ é obrigatório para entityType=pj',
    path: ['document'],
  });

export class CreateKlubDto extends createZodDto(CreateKlubSchema) {}
