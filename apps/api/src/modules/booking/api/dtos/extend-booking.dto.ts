import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ExtendBookingSchema = z.object({
  additionalMinutes: z.number().int().min(15),
  notes: z.string().max(500).optional(),
});

export const RejectExtensionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export class ExtendBookingDto extends createZodDto(ExtendBookingSchema) {}
export class RejectExtensionDto extends createZodDto(RejectExtensionSchema) {}
