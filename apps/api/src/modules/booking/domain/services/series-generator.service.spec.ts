import { describe, it, expect, beforeEach } from 'vitest';
import { SeriesGeneratorService } from './series-generator.service';

const HOUR = 19;
const MIN = 0;
const DUR = 60;

function base(overrides: Partial<Parameters<SeriesGeneratorService['generate']>[0]> = {}) {
  return {
    startsOn: new Date('2026-01-06T00:00:00Z'), // Tuesday
    endsOn: new Date('2026-01-31T23:59:59Z'),
    frequency: 'weekly' as const,
    interval: 1,
    daysOfWeek: [2, 4], // Tuesday, Thursday
    startHour: HOUR,
    startMinute: MIN,
    durationMinutes: DUR,
    ...overrides,
  };
}

describe('SeriesGeneratorService', () => {
  let svc: SeriesGeneratorService;

  beforeEach(() => {
    svc = new SeriesGeneratorService();
  });

  it('weekly Tue+Thu por ~4 semanas gera 8 ocorrências', () => {
    const result = svc.generate(base());
    expect(result.length).toBe(8);
    // All in 19:00-20:00 UTC
    for (const r of result) {
      expect(r.startsAt.getUTCHours()).toBe(19);
      expect(r.endsAt.getTime() - r.startsAt.getTime()).toBe(60 * 60_000);
    }
  });

  it('weekly interval=2 a cada 2 semanas', () => {
    const result = svc.generate(base({ interval: 2, daysOfWeek: [2] })); // Tuesdays a cada 2 semanas
    // Tuesdays de Jan: 6, 13, 20, 27 → interval=2 pega 6 e 20
    expect(result.length).toBe(2);
    expect(result[0]?.startsAt.toISOString()).toBe('2026-01-06T19:00:00.000Z');
    expect(result[1]?.startsAt.toISOString()).toBe('2026-01-20T19:00:00.000Z');
  });

  it('biweekly interval=1 equivale a weekly interval=2', () => {
    const result = svc.generate(base({ frequency: 'biweekly', interval: 1, daysOfWeek: [2] }));
    expect(result.length).toBe(2);
    expect(result[0]?.startsAt.toISOString()).toBe('2026-01-06T19:00:00.000Z');
    expect(result[1]?.startsAt.toISOString()).toBe('2026-01-20T19:00:00.000Z');
  });

  it('monthly por 6 meses gera 6 ocorrências', () => {
    const result = svc.generate(
      base({
        frequency: 'monthly',
        startsOn: new Date('2026-01-15T00:00:00Z'),
        endsOn: new Date('2026-07-15T23:59:59Z'),
        daysOfWeek: [],
      }),
    );
    expect(result.length).toBe(7); // Jan, Feb, Mar, Apr, May, Jun, Jul
    expect(result[0]?.startsAt.getUTCDate()).toBe(15);
    expect(result[1]?.startsAt.getUTCDate()).toBe(15);
  });

  it('monthly day=31 em fevereiro usa ultimo dia do mes (não faz overflow)', () => {
    const result = svc.generate(
      base({
        frequency: 'monthly',
        startsOn: new Date('2026-01-31T00:00:00Z'),
        endsOn: new Date('2026-04-30T23:59:59Z'),
        daysOfWeek: [],
      }),
    );
    // Jan 31, Feb 28 (2026 não é bissexto), Mar 31, Apr 30
    expect(result.length).toBe(4);
    expect(result[0]?.startsAt.toISOString()).toBe('2026-01-31T19:00:00.000Z');
    expect(result[1]?.startsAt.toISOString()).toBe('2026-02-28T19:00:00.000Z');
    expect(result[2]?.startsAt.toISOString()).toBe('2026-03-31T19:00:00.000Z');
    expect(result[3]?.startsAt.toISOString()).toBe('2026-04-30T19:00:00.000Z');
  });

  it('rejeita endsOn antes de startsOn', () => {
    expect(() =>
      svc.generate(
        base({ startsOn: new Date('2026-02-01Z'), endsOn: new Date('2026-01-01Z') }),
      ),
    ).toThrow(/endsOn/);
  });

  it('rejeita daysOfWeek vazio em weekly', () => {
    expect(() => svc.generate(base({ daysOfWeek: [] }))).toThrow(/daysOfWeek/);
  });

  it('rejeita interval < 1', () => {
    expect(() => svc.generate(base({ interval: 0 }))).toThrow(/interval/);
  });
});
