import { describe, it, expect, beforeEach } from 'vitest';
import { TournamentValidatorService } from './tournament-validator.service';

describe('TournamentValidatorService', () => {
  let service: TournamentValidatorService;

  const baseDates = {
    registrationOpensAt: new Date('2026-05-01T00:00:00Z'),
    registrationClosesAt: new Date('2026-05-05T00:00:00Z'),
    drawDate: new Date('2026-05-06T00:00:00Z'),
    mainStartDate: new Date('2026-05-10T00:00:00Z'),
    mainEndDate: new Date('2026-05-15T00:00:00Z'),
  };

  beforeEach(() => {
    service = new TournamentValidatorService();
  });

  it('valida sequência cronológica correta sem pré', () => {
    expect(() => service.validateDates(baseDates, false)).not.toThrow();
  });

  it('rejeita registrationOpensAt >= registrationClosesAt', () => {
    expect(() =>
      service.validateDates(
        { ...baseDates, registrationOpensAt: baseDates.registrationClosesAt },
        false,
      ),
    ).toThrow();
  });

  it('rejeita drawDate > mainStartDate sem pré', () => {
    expect(() =>
      service.validateDates({ ...baseDates, drawDate: new Date('2026-05-11T00:00:00Z') }, false),
    ).toThrow();
  });

  it('exige prequalifier dates quando hasPrequalifiers=true', () => {
    expect(() => service.validateDates(baseDates, true)).toThrow();
  });

  it('aceita sequência com pré válida', () => {
    expect(() =>
      service.validateDates(
        {
          ...baseDates,
          prequalifierStartDate: new Date('2026-05-07T00:00:00Z'),
          prequalifierEndDate: new Date('2026-05-09T00:00:00Z'),
        },
        true,
      ),
    ).not.toThrow();
  });

  it('rejeita pré sem bordersPerFrontier', () => {
    expect(() => service.validatePrequalifierConfig(true, null, 3)).toThrow();
  });

  it('aceita config de pré válida', () => {
    expect(() => service.validatePrequalifierConfig(true, 2, 3)).not.toThrow();
  });
});
