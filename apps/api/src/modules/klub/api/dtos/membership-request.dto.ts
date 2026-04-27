import { z } from 'zod';

export const RequestMembershipSchema = z.object({
  message: z.string().min(10).max(1000),
  attachmentUrl: z.string().url().max(500).optional(),
});
export type RequestMembershipDto = z.infer<typeof RequestMembershipSchema>;

export const ListMembershipRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListMembershipRequestsQueryDto = z.infer<typeof ListMembershipRequestsQuerySchema>;

export const RejectMembershipRequestSchema = z.object({
  reason: z.string().min(10).max(500),
});
export type RejectMembershipRequestDto = z.infer<typeof RejectMembershipRequestSchema>;
