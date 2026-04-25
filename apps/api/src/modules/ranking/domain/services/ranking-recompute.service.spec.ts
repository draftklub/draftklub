import { describe, it, expect, beforeEach } from 'vitest';
import { RankingRecomputeService } from './ranking-recompute.service';

function makeService() {
  return new RankingRecomputeService(null as never, null as never);
}

describe('RankingRecomputeService.buildSourceFilter', () => {
  let service: RankingRecomputeService;

  beforeEach(() => {
    service = makeService();
  });

  it('inclui casual + tournament + tournament_prequalifier por padrão', () => {
    const sources = service.buildSourceFilter({
      includesCasualMatches: true,
      includesTournamentMatches: true,
    });
    expect(sources).toEqual(['casual', 'tournament', 'tournament_prequalifier']);
  });

  it('inclui só casual quando includesTournamentMatches=false', () => {
    const sources = service.buildSourceFilter({
      includesCasualMatches: true,
      includesTournamentMatches: false,
    });
    expect(sources).toEqual(['casual']);
  });

  it('exclui tudo quando ambos false', () => {
    const sources = service.buildSourceFilter({
      includesCasualMatches: false,
      includesTournamentMatches: false,
    });
    expect(sources).toEqual([]);
  });
});

describe('RankingRecomputeService.buildDateFilter', () => {
  let service: RankingRecomputeService;

  beforeEach(() => {
    service = makeService();
  });

  it('retorna undefined para all_time', () => {
    const filter = service.buildDateFilter({
      windowType: 'all_time',
      windowSize: null,
      windowStartDate: null,
    });
    expect(filter).toBeUndefined();
  });

  it('retorna gte=windowStartDate para season', () => {
    const startDate = new Date('2026-01-01T00:00:00Z');
    const filter = service.buildDateFilter({
      windowType: 'season',
      windowSize: null,
      windowStartDate: startDate,
    });
    expect(filter?.gte).toEqual(startDate);
  });

  it('retorna gte=now-12weeks para last_weeks=12', () => {
    const filter = service.buildDateFilter({
      windowType: 'last_weeks',
      windowSize: 12,
      windowStartDate: null,
    });
    expect(filter?.gte).toBeInstanceOf(Date);
    const expectedMs = Date.now() - 12 * 7 * 24 * 60 * 60 * 1000;
    expect(filter?.gte.getTime()).toBeGreaterThan(expectedMs - 5000);
    expect(filter?.gte.getTime()).toBeLessThan(expectedMs + 5000);
  });

  it('usa windowSize default=12 para last_weeks sem windowSize', () => {
    const filter = service.buildDateFilter({
      windowType: 'last_weeks',
      windowSize: null,
      windowStartDate: null,
    });
    expect(filter?.gte).toBeInstanceOf(Date);
  });

  it('retorna undefined para windowType desconhecido', () => {
    const filter = service.buildDateFilter({
      windowType: 'last_tournaments',
      windowSize: 5,
      windowStartDate: null,
    });
    expect(filter).toBeUndefined();
  });
});
