import { z } from 'zod';

/**
 * GET /klubs/discover — query string params. Todos opcionais; sem
 * filtros retorna a lista alfabética dos discoverable=true (capada
 * pelo limit).
 */
export const DiscoverKlubsQuerySchema = z.object({
  q: z.string().min(2).max(100).optional(),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'UF deve ser 2 letras maiúsculas')
    .optional(),
  sport: z.string().min(2).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type DiscoverKlubsQueryDto = z.infer<typeof DiscoverKlubsQuerySchema>;
