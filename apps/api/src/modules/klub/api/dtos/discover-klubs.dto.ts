import { z } from 'zod';

/**
 * GET /klubs/discover — query string params. Todos opcionais; sem
 * filtros retorna a lista alfabética dos discoverable=true (capada
 * pelo limit).
 *
 * Sprint B+1: lat/lng/radiusKm habilitam Haversine sort por distância
 * (substitui tier-based sort quando presentes).
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
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
});

export type DiscoverKlubsQueryDto = z.infer<typeof DiscoverKlubsQuerySchema>;
