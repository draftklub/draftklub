import { describe, it, expect, beforeEach } from 'vitest';
import {
  HourBandResolverService,
  type HourBand,
} from './hour-band-resolver.service';

const BANDS: HourBand[] = [
  {
    type: 'off_peak',
    startHour: 6,
    endHour: 12,
    daysOfWeek: [1, 2, 3, 4, 5],
    durationByMatchType: { singles: 60, doubles: 90 },
  },
  {
    type: 'regular',
    startHour: 12,
    endHour: 17,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    durationByMatchType: { singles: 60, doubles: 90 },
  },
  {
    type: 'prime',
    startHour: 17,
    endHour: 22,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    durationByMatchType: { singles: 60 },
  },
];

function dateAt(dayOfWeekIso: number, hour: number): Date {
  // dayOfWeekIso 1=Mon..7=Sun. Choose a known Monday: 2026-05-04 is Monday (UTC).
  const baseMonday = new Date('2026-05-04T00:00:00Z');
  const d = new Date(baseMonday.getTime() + (dayOfWeekIso - 1) * 24 * 3_600_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

describe('HourBandResolverService', () => {
  let svc: HourBandResolverService;

  beforeEach(() => {
    svc = new HourBandResolverService();
  });

  it('resolve banda regular para horario regular', () => {
    const start = dateAt(2, 13);
    const r = svc.resolve(start, 'singles', BANDS, 60);
    expect(r.band.type).toBe('regular');
    expect(r.endsAt.getTime() - start.getTime()).toBe(60 * 60_000);
  });

  it('resolve banda prime para horario noturno', () => {
    const start = dateAt(3, 19);
    const r = svc.resolve(start, 'singles', BANDS, 60);
    expect(r.band.type).toBe('prime');
  });

  it('resolve banda off_peak segunda-feira de manha', () => {
    const start = dateAt(1, 8);
    const r = svc.resolve(start, 'doubles', BANDS, 60);
    expect(r.band.type).toBe('off_peak');
    expect(r.endsAt.getTime() - start.getTime()).toBe(90 * 60_000);
  });

  it('lanca erro quando nenhuma banda cobre (gap)', () => {
    const start = dateAt(2, 23);
    expect(() => svc.resolve(start, 'singles', BANDS, 60)).toThrow(/No hour band/);
  });

  it('lanca erro quando banda nao tem duration para o matchType', () => {
    const start = dateAt(3, 19); // prime: only singles
    expect(() => svc.resolve(start, 'doubles', BANDS, 60)).toThrow(/does not allow doubles/);
  });

  it('usa fallback quando hourBands esta vazio', () => {
    const start = dateAt(2, 14);
    const r = svc.resolve(start, 'singles', [], 75);
    expect(r.band.type).toBe('regular');
    expect(r.endsAt.getTime() - start.getTime()).toBe(75 * 60_000);
  });

  it('bandAllowsGuests: prime=false, regular=true, off_peak=true', () => {
    const offPeak = BANDS[0];
    const regular = BANDS[1];
    const prime = BANDS[2];
    if (!offPeak || !regular || !prime) throw new Error('bands missing');
    expect(svc.bandAllowsGuests(prime)).toBe(false);
    expect(svc.bandAllowsGuests(regular)).toBe(true);
    expect(svc.bandAllowsGuests(offPeak)).toBe(true);
  });

  it('intervalCrossesBandBoundary detecta cruzamento regular -> prime', () => {
    const start = dateAt(2, 16);
    const end = new Date(start.getTime() + 90 * 60_000); // ate 17:30
    const r = svc.intervalCrossesBandBoundary(start, end, BANDS);
    expect(r.crosses).toBe(true);
    expect(r.finalBand?.type).toBe('prime');
  });

  it('intervalCrossesBandBoundary nao cruza dentro da mesma banda', () => {
    const start = dateAt(2, 13);
    const end = new Date(start.getTime() + 60 * 60_000);
    const r = svc.intervalCrossesBandBoundary(start, end, BANDS);
    expect(r.crosses).toBe(false);
  });
});
