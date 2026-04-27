import { z } from 'zod';

/**
 * PATCH /me — todos campos opcionais. Backend só atualiza fields
 * presentes no body (Prisma update parcial). State em maiúsculas (UF
 * Brasil).
 */
export const UpdateMeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  // ISO date YYYY-MM-DD; sem time
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use formato YYYY-MM-DD')
    .optional(),
  avatarUrl: z.string().url().max(500).optional(),
  gender: z.enum(['male', 'female', 'undisclosed']).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'UF deve ser 2 letras maiúsculas')
    .optional(),
});

export type UpdateMeDto = z.infer<typeof UpdateMeSchema>;
