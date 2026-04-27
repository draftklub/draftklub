import { Injectable, BadRequestException } from '@nestjs/common';

export type BandType = 'off_peak' | 'regular' | 'prime';
export type MatchType = 'singles' | 'doubles';

export interface HourBand {
  type: BandType;
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
  durationByMatchType: { singles?: number; doubles?: number };
}

export interface ResolvedBand {
  band: HourBand;
  endsAt: Date;
}

@Injectable()
export class HourBandResolverService {
  /**
   * Identifica a banda aplicavel ao datetime + matchType.
   * Retorna a banda + endsAt calculado.
   *
   * Sem hourBands configuradas (array vazio):
   *   - Usa fallbackDurationMinutes
   *   - Banda virtual type='regular' (assume regular pra guest validation)
   */
  resolve(
    startsAt: Date,
    matchType: MatchType,
    hourBands: HourBand[],
    fallbackDurationMinutes: number,
  ): ResolvedBand {
    if (!hourBands || hourBands.length === 0) {
      const virtualBand: HourBand = {
        type: 'regular',
        startHour: 0,
        endHour: 24,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        durationByMatchType: {
          singles: fallbackDurationMinutes,
          doubles: fallbackDurationMinutes,
        },
      };
      return {
        band: virtualBand,
        endsAt: new Date(startsAt.getTime() + fallbackDurationMinutes * 60_000),
      };
    }

    const matching = this.findBand(startsAt, hourBands);
    if (!matching) {
      const dayOfWeek = startsAt.getUTCDay() || 7;
      const hour = startsAt.getUTCHours();
      throw new BadRequestException(
        `No hour band covers this time (day ${dayOfWeek}, hour ${hour})`,
      );
    }

    const duration = matching.durationByMatchType[matchType];
    if (!duration) {
      throw new BadRequestException(`Band '${matching.type}' does not allow ${matchType}`);
    }

    return {
      band: matching,
      endsAt: new Date(startsAt.getTime() + duration * 60_000),
    };
  }

  /**
   * Regra: prime nunca permite, off_peak e regular sempre permitem.
   */
  bandAllowsGuests(band: HourBand): boolean {
    return band.type !== 'prime';
  }

  /**
   * Verifica se intervalo cruza fronteira de banda diferente.
   * Util pra validar extensao.
   */
  intervalCrossesBandBoundary(
    startsAt: Date,
    endsAt: Date,
    hourBands: HourBand[],
  ): { crosses: boolean; finalBand?: HourBand } {
    if (!hourBands || hourBands.length === 0) return { crosses: false };
    const startBand = this.findBand(startsAt, hourBands);
    const lastMinute = new Date(endsAt.getTime() - 60_000);
    const endBand = this.findBand(lastMinute, hourBands);

    if (!startBand || !endBand) {
      return { crosses: false };
    }

    return {
      crosses: startBand.type !== endBand.type,
      finalBand: endBand,
    };
  }

  private findBand(d: Date, hourBands: HourBand[]): HourBand | null {
    if (!hourBands || hourBands.length === 0) return null;
    const dayOfWeek = d.getUTCDay() || 7;
    const hour = d.getUTCHours();
    return (
      hourBands.find(
        (b) => b.daysOfWeek.includes(dayOfWeek) && hour >= b.startHour && hour < b.endHour,
      ) ?? null
    );
  }
}
