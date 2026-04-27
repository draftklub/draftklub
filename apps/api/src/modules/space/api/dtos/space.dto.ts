import { z } from 'zod';
import { HourBandsArraySchema } from '../../../booking/api/dtos/hour-band.dto';

const SportCodeEnum = z.enum(['tennis', 'padel', 'squash', 'beach_tennis']);
const SpaceTypeEnum = z.enum(['court', 'room', 'pool', 'field', 'other']);
const SurfaceEnum = z.enum(['clay', 'hard', 'grass', 'synthetic', 'carpet']);
const MatchTypeEnum = z.enum(['singles', 'doubles']);
const StatusEnum = z.enum(['active', 'maintenance', 'inactive']);

export const CreateSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  type: SpaceTypeEnum.default('court'),
  sportCode: SportCodeEnum.optional(),
  surface: SurfaceEnum.optional(),
  indoor: z.boolean().default(false),
  hasLighting: z.boolean().default(false),
  maxPlayers: z.number().int().min(1).max(50).default(4),
  description: z.string().max(500).optional(),

  slotGranularityMinutes: z
    .number()
    .int()
    .min(15)
    .max(180)
    .refine((v) => v % 15 === 0, 'Granularity deve ser múltiplo de 15')
    .default(30),
  slotDefaultDurationMinutes: z.number().int().min(15).max(360).default(60),

  hourBands: HourBandsArraySchema.default([]),
  allowedMatchTypes: z.array(MatchTypeEnum).min(1).default(['singles', 'doubles']),
});

export type CreateSpaceDto = z.infer<typeof CreateSpaceSchema>;

export const UpdateSpaceSchema = CreateSpaceSchema.partial()
  .extend({
    status: StatusEnum.optional(),
    bookingActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Patch vazio' });

export type UpdateSpaceDto = z.infer<typeof UpdateSpaceSchema>;
