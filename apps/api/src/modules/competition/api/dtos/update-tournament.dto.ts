import { z } from 'zod';

/**
 * Sprint K PR-K5a — DTO pra editar tournament pós-create.
 *
 * Campos editáveis: name, description, datas, registrationApproval,
 * registrationFee. Campos sensíveis (format, hasPrequalifiers, ranking,
 * categories) não são editáveis depois — exigiriam recriar bracket
 * inteiro. Reporting mode tem endpoint dedicado (PATCH /reporting-mode).
 *
 * Todas as datas opcionais permitem edits parciais (ex: só mudar
 * mainEndDate). Backend valida ordem temporal global na execução.
 */
export const UpdateTournamentSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
    coverUrl: z.string().url().nullable().optional(),
    registrationApproval: z.enum(['auto', 'committee']).optional(),
    registrationFee: z.number().nonnegative().nullable().optional(),
    registrationOpensAt: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    registrationClosesAt: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    drawDate: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    prequalifierStartDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .transform((v) => (v == null ? v : new Date(v))),
    prequalifierEndDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .transform((v) => (v == null ? v : new Date(v))),
    mainStartDate: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    mainEndDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .transform((v) => (v == null ? v : new Date(v))),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo precisa ser fornecido pra update.',
  });

export type UpdateTournamentDto = z.infer<typeof UpdateTournamentSchema>;
