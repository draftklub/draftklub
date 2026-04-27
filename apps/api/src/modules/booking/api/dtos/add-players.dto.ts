import { z } from 'zod';
import { uuidString } from '../../../../shared/validation/uuid-string';

const ExistingPlayerSchema = z.object({
  userId: uuidString(),
});

const GuestPlayerSchema = z.object({
  guest: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    documentNumber: z.string().max(50).optional(),
    documentType: z.enum(['cpf', 'rg', 'passport', 'other']).optional(),
    phone: z.string().max(30).optional(),
  }),
});

const PlayerSchema = z.union([ExistingPlayerSchema, GuestPlayerSchema]);

export const AddPlayersSchema = z.object({
  players: z.array(PlayerSchema).min(1).max(3),
});

export type AddPlayersDto = z.infer<typeof AddPlayersSchema>;
