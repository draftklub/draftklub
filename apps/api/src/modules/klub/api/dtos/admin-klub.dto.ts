import { z } from 'zod';

export const ListPendingKlubsQuerySchema = z.object({
  type: z.enum(['pj', 'pf']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  q: z.string().min(2).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListPendingKlubsQueryDto = z.infer<typeof ListPendingKlubsQuerySchema>;

export const UpdatePendingKlubSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve ser kebab-case')
      .optional(),
    addressStreet: z.string().max(200).optional(),
    addressNumber: z.string().max(20).optional(),
    addressComplement: z.string().max(100).optional(),
    addressNeighborhood: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2).optional(),
    cep: z
      .string()
      .length(8)
      .regex(/^\d{8}$/)
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Patch vazio' });

export type UpdatePendingKlubDto = z.infer<typeof UpdatePendingKlubSchema>;

export const RejectKlubSchema = z.object({
  reason: z.string().min(10).max(500),
});

export type RejectKlubDto = z.infer<typeof RejectKlubSchema>;
