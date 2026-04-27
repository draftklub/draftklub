import { z } from 'zod';

/**
 * GET /klubs/check-slug — preview de slug pro form de cadastro. Backend
 * aplica o algoritmo determinístico (`nome+bairro+cidade`) e responde
 * se está livre. Cliente NÃO envia slug pronto.
 */
export const CheckSlugQuerySchema = z.object({
  name: z.string().min(2).max(100),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

export type CheckSlugQueryDto = z.infer<typeof CheckSlugQuerySchema>;
