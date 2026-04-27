import { z } from 'zod';

export const HourBandSchema = z
  .object({
    type: z.enum(['off_peak', 'regular', 'prime']),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1),
    durationByMatchType: z.object({
      singles: z.number().int().min(15).max(360).optional(),
      doubles: z.number().int().min(15).max(360).optional(),
    }),
  })
  .refine((b) => b.endHour > b.startHour, {
    message: 'endHour must be greater than startHour',
  });

export type HourBandDto = z.infer<typeof HourBandSchema>;

/**
 * Lista de hour bands de um Space.
 *
 * Histórico:
 * - Antes de Onda 2 Sprint B+3 prep: max 3 bands, cada `type` no máximo 1×
 *   (modelo "tarifário básico" off-peak/regular/prime).
 * - Agora: max 20 bands, sem restrição de type (permite alternâncias e
 *   variações por dia da semana). Em troca, exigimos NÃO-OVERLAP por
 *   `(daysOfWeek, hour range)` — duas bandas não podem cobrir o mesmo
 *   dia+hora pra evitar comportamento ambíguo no `HourBandResolver`.
 */
export const HourBandsArraySchema = z.array(HourBandSchema).max(20).refine(detectOverlap, {
  message: 'Duas bandas não podem cobrir o mesmo dia+hora — confira a sobreposição',
});

/**
 * Retorna `true` se NÃO há overlap (pra Zod refine, true = passa).
 *
 * Overlap = existe par de bandas (i, j), i ≠ j, que compartilham pelo menos
 * 1 day em daysOfWeek E intervalos `[startHour, endHour)` se cruzam.
 *
 * Tocar na fronteira NÃO é overlap (ex: band A ends 12, band B starts 12).
 */
function detectOverlap(bands: HourBandDto[]): boolean {
  for (let i = 0; i < bands.length; i++) {
    const a = bands[i];
    if (!a) continue;
    for (let j = i + 1; j < bands.length; j++) {
      const b = bands[j];
      if (!b) continue;
      const sharedDays = a.daysOfWeek.some((d) => b.daysOfWeek.includes(d));
      if (!sharedDays) continue;
      const hoursOverlap = Math.max(a.startHour, b.startHour) < Math.min(a.endHour, b.endHour);
      if (hoursOverlap) return false;
    }
  }
  return true;
}
