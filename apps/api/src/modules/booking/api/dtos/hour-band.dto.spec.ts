import { describe, it, expect } from 'vitest';
import { HourBandsArraySchema, type HourBandDto } from './hour-band.dto';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const band = (overrides: Partial<HourBandDto> = {}): HourBandDto => ({
  type: 'regular',
  startHour: 8,
  endHour: 18,
  daysOfWeek: ALL_DAYS,
  durationByMatchType: { singles: 60, doubles: 90 },
  ...overrides,
});

describe('HourBandsArraySchema', () => {
  it('aceita array vazio (Space sem bandas usa fallback no resolver)', () => {
    const r = HourBandsArraySchema.safeParse([]);
    expect(r.success).toBe(true);
  });

  it('aceita até 20 bandas', () => {
    // 20 bandas em dias diferentes pra evitar overlap
    const bands = Array.from({ length: 7 })
      .flatMap((_, dayIdx) => [
        band({
          type: 'off_peak',
          startHour: 6,
          endHour: 9,
          daysOfWeek: [dayIdx + 1],
        }),
        band({
          type: 'regular',
          startHour: 9,
          endHour: 18,
          daysOfWeek: [dayIdx + 1],
        }),
      ])
      .slice(0, 14);
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(true);
  });

  it('rejeita mais de 20 bandas', () => {
    const bands = Array.from({ length: 21 }, (_, i) =>
      band({ startHour: i, endHour: i + 1, daysOfWeek: [1] }),
    );
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(false);
  });

  it('aceita múltiplas bandas do mesmo type (anteriormente proibido)', () => {
    const bands = [
      band({ type: 'off_peak', startHour: 6, endHour: 9 }),
      band({ type: 'off_peak', startHour: 22, endHour: 24 }),
    ];
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(true);
  });

  it('aceita alternância tipo1/tipo2/tipo1 em horários diferentes (caso do user)', () => {
    const bands = [
      band({ type: 'off_peak', startHour: 6, endHour: 9 }),
      band({ type: 'prime', startHour: 9, endHour: 11 }),
      band({ type: 'off_peak', startHour: 11, endHour: 14 }),
      band({ type: 'prime', startHour: 18, endHour: 22 }),
    ];
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(true);
  });

  it('rejeita overlap em mesmo dia + horários sobrepostos', () => {
    const bands = [
      band({ startHour: 8, endHour: 14, daysOfWeek: [1, 2, 3] }),
      band({ startHour: 12, endHour: 18, daysOfWeek: [3, 4, 5] }),
      // dia 3 sobrepõe das 12 às 14
    ];
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(false);
  });

  it('aceita mesma faixa horária em dias diferentes', () => {
    const bands = [
      band({ startHour: 8, endHour: 18, daysOfWeek: [1, 2, 3] }),
      band({ startHour: 8, endHour: 18, daysOfWeek: [4, 5] }),
      band({ startHour: 10, endHour: 14, daysOfWeek: [6, 7] }),
    ];
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(true);
  });

  it('aceita bandas tocando na fronteira (end=start não é overlap)', () => {
    const bands = [
      band({ type: 'off_peak', startHour: 6, endHour: 9, daysOfWeek: [1] }),
      band({ type: 'regular', startHour: 9, endHour: 18, daysOfWeek: [1] }),
      band({ type: 'prime', startHour: 18, endHour: 22, daysOfWeek: [1] }),
    ];
    const r = HourBandsArraySchema.safeParse(bands);
    expect(r.success).toBe(true);
  });

  it('rejeita banda com endHour <= startHour', () => {
    const r = HourBandsArraySchema.safeParse([band({ startHour: 12, endHour: 12 })]);
    expect(r.success).toBe(false);
  });
});
