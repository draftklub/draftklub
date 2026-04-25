import { z } from 'zod';

export const ExtendBookingSchema = z.object({
  additionalMinutes: z.number().int().min(15),
  notes: z.string().max(500).optional(),
});

export const RejectExtensionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ExtendBookingDto = z.infer<typeof ExtendBookingSchema>;
export type RejectExtensionDto = z.infer<typeof RejectExtensionSchema>;
