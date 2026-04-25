import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleDistributorService, type MatchToSchedule } from './schedule-distributor.service';
import type { ScheduleConfig } from '../../api/dtos/schedule-config.dto';

const SPACE_A = '00000000-0000-0000-0001-000000000001';
const SPACE_B = '00000000-0000-0000-0001-000000000002';

function makeConfig(overrides: Partial<ScheduleConfig> = {}): ScheduleConfig {
  return {
    availableDates: ['2026-05-10'],
    startHour: 8,
    endHour: 12,
    matchDurationMinutes: 60,
    breakBetweenMatchesMinutes: 0,
    spaceIds: [SPACE_A, SPACE_B],
    restRuleMinutes: 0,
    ...overrides,
  };
}

function makeMatch(overrides: Partial<MatchToSchedule> & { id: string }): MatchToSchedule {
  return {
    id: overrides.id,
    player1Id: overrides.player1Id ?? 'p1',
    player2Id: overrides.player2Id ?? 'p2',
    round: overrides.round ?? 1,
    bracketPosition: overrides.bracketPosition ?? 'QF-1',
  };
}

describe('ScheduleDistributorService.generateSlots', () => {
  let service: ScheduleDistributorService;

  beforeEach(() => {
    service = new ScheduleDistributorService(null as never);
  });

  it('gera slots para 1 dia, 4 horas, 60min, 2 quadras = 8 slots', () => {
    const slots = service.generateSlots(makeConfig());
    expect(slots.length).toBe(8);
  });

  it('respeita break entre partidas (60min + 15min break = step 75)', () => {
    const slots = service.generateSlots(
      makeConfig({ matchDurationMinutes: 60, breakBetweenMatchesMinutes: 15 }),
    );
    expect(slots.length).toBe(6);
    const startTimes = slots
      .filter((s) => s.spaceId === SPACE_A)
      .map((s) => s.startTime.toISOString());
    expect(startTimes).toEqual([
      '2026-05-10T08:00:00.000Z',
      '2026-05-10T09:15:00.000Z',
      '2026-05-10T10:30:00.000Z',
    ]);
  });
});

describe('ScheduleDistributorService.assignMatchesToSlots', () => {
  let service: ScheduleDistributorService;

  beforeEach(() => {
    service = new ScheduleDistributorService(null as never);
  });

  it('aloca 2 partidas em 2 quadras no mesmo horário', () => {
    const config = makeConfig();
    const slots = service.generateSlots(config);
    const matches = [
      makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' }),
      makeMatch({ id: 'm2', player1Id: 'p3', player2Id: 'p4' }),
    ];
    const result = service.assignMatchesToSlots(matches, slots, config);
    expect(result.scheduled.length).toBe(2);
    expect(result.unscheduled.length).toBe(0);
    expect(new Set(result.scheduled.map((s) => s.spaceId)).size).toBe(2);
    expect(result.scheduled[0]?.startTime.toISOString()).toBe('2026-05-10T08:00:00.000Z');
    expect(result.scheduled[1]?.startTime.toISOString()).toBe('2026-05-10T08:00:00.000Z');
  });

  it('jogador conflitante: empurra segunda partida para próximo horário', () => {
    const config = makeConfig();
    const slots = service.generateSlots(config);
    const matches = [
      makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' }),
      makeMatch({ id: 'm2', player1Id: 'p1', player2Id: 'p3' }),
    ];
    const result = service.assignMatchesToSlots(matches, slots, config);
    expect(result.scheduled.length).toBe(2);
    const start1 = result.scheduled[0]?.startTime.toISOString();
    const start2 = result.scheduled[1]?.startTime.toISOString();
    expect(start1).toBe('2026-05-10T08:00:00.000Z');
    expect(start2).toBe('2026-05-10T09:00:00.000Z');
  });

  it('respeita restRuleMinutes entre partidas do mesmo jogador', () => {
    // M1 em 08:00-09:00. Com restRuleMinutes=90, M2 só pode comecar a partir das 10:30.
    // Slots disponiveis: 8, 9, 10, 11. Primeiro >=10:30 = 11:00.
    const config = makeConfig({ restRuleMinutes: 90 });
    const slots = service.generateSlots(config);
    const matches = [
      makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' }),
      makeMatch({ id: 'm2', player1Id: 'p1', player2Id: 'p3' }),
    ];
    const result = service.assignMatchesToSlots(matches, slots, config);
    expect(result.scheduled.length).toBe(2);
    const m2 = result.scheduled.find((s) => s.matchId === 'm2');
    expect(m2?.startTime.toISOString()).toBe('2026-05-10T11:00:00.000Z');
  });

  it('marca unscheduled quando slots esgotam', () => {
    const config = makeConfig({
      availableDates: ['2026-05-10'],
      startHour: 8,
      endHour: 9,
      matchDurationMinutes: 60,
      spaceIds: [SPACE_A],
      restRuleMinutes: 0,
    });
    const slots = service.generateSlots(config);
    expect(slots.length).toBe(1);

    const matches = [
      makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' }),
      makeMatch({ id: 'm2', player1Id: 'p3', player2Id: 'p4' }),
    ];
    const result = service.assignMatchesToSlots(matches, slots, config);
    expect(result.scheduled.length).toBe(1);
    expect(result.unscheduled.length).toBe(1);
    expect(result.unscheduled[0]?.reason).toBe('no available slot');
  });

  it('warning quando slot fora do horário do Klub (closing < slotHour)', () => {
    const config = makeConfig({ startHour: 18, endHour: 22 });
    const slots = service.generateSlots(config);
    const matches = [makeMatch({ id: 'm1', player1Id: 'p1', player2Id: 'p2' })];
    const result = service.assignMatchesToSlots(matches, slots, config, {
      openingHour: 8,
      closingHour: 18,
    });
    expect(result.scheduled[0]?.warning).toMatch(/outside Klub hours/);
  });

  it('ordena partidas por round asc antes de alocar (R1 antes de R2)', () => {
    const config = makeConfig({ startHour: 8, endHour: 11, spaceIds: [SPACE_A] });
    const slots = service.generateSlots(config);
    const matches = [
      makeMatch({ id: 'r2', round: 2, bracketPosition: 'SF-1', player1Id: 'p5', player2Id: 'p6' }),
      makeMatch({ id: 'r1a', round: 1, bracketPosition: 'QF-1', player1Id: 'p1', player2Id: 'p2' }),
      makeMatch({ id: 'r1b', round: 1, bracketPosition: 'QF-2', player1Id: 'p3', player2Id: 'p4' }),
    ];
    const result = service.assignMatchesToSlots(matches, slots, config);
    expect(result.scheduled[0]?.matchId).toBe('r1a');
    expect(result.scheduled[1]?.matchId).toBe('r1b');
    expect(result.scheduled[2]?.matchId).toBe('r2');
  });
});
