import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
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

export const CreateBookingSchema = z.object({
  spaceId: uuidString(),
  startsAt: z.string().datetime(),
  matchType: z.enum(['singles', 'doubles']),
  bookingType: z.enum(['player_match', 'player_free_play']).default('player_match'),
  primaryPlayerId: uuidString().optional(),
  otherPlayers: z.array(PlayerSchema).default([]),
  responsibleMemberId: uuidString().optional(),
  notes: z.string().max(500).optional(),
});

export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}
