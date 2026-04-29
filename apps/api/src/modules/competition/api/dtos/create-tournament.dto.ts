import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(20),
  order: z.number().int().min(0),
  maxPlayers: z.number().int().positive().optional(),
  minRatingExpected: z.number().int().optional(),
  maxRatingExpected: z.number().int().optional(),
  pointsSchemaId: uuidString(),
});

export const CreateTournamentSchema = z.object({
  rankingId: uuidString(),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  format: z
    .enum(['knockout', 'round_robin', 'double_elimination', 'groups_knockout'])
    .default('knockout'),
  hasPrequalifiers: z.boolean().default(false),
  prequalifierBordersPerFrontier: z.number().int().positive().optional(),
  registrationApproval: z.enum(['auto', 'committee']).default('auto'),
  registrationFee: z.number().positive().optional(),
  registrationOpensAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  registrationClosesAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  drawDate: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  prequalifierStartDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  prequalifierEndDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  mainStartDate: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  mainEndDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  scheduleConfig: z.record(z.unknown()).optional(),
  resultReportingMode: z.enum(['committee_only', 'player_with_confirm']).default('committee_only'),
  categories: z.array(CreateCategorySchema).min(1),
});

export class CreateTournamentDto extends createZodDto(CreateTournamentSchema) {}
