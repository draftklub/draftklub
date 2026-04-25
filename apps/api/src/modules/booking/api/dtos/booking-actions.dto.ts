import { z } from 'zod';

export const ApproveBookingSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const RejectBookingSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const CancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type ApproveBookingDto = z.infer<typeof ApproveBookingSchema>;
export type RejectBookingDto = z.infer<typeof RejectBookingSchema>;
export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
