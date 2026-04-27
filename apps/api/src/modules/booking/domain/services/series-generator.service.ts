import { Injectable, BadRequestException } from '@nestjs/common';

export type Frequency = 'weekly' | 'biweekly' | 'monthly';

export interface SeriesGenerationInput {
  startsOn: Date;
  endsOn: Date;
  frequency: Frequency;
  interval: number;
  /** 0=Sunday, 1=Monday, ..., 6=Saturday. Used for weekly/biweekly. */
  daysOfWeek: number[];
  startHour: number;
  startMinute: number;
  durationMinutes: number;
}

export interface GeneratedOccurrence {
  startsAt: Date;
  endsAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60_000;

function daysInMonth(year: number, monthZeroBased: number): number {
  // Day=0 of next month gives last day of current month
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

@Injectable()
export class SeriesGeneratorService {
  generate(input: SeriesGenerationInput): GeneratedOccurrence[] {
    if (input.endsOn.getTime() <= input.startsOn.getTime()) {
      throw new BadRequestException('endsOn must be after startsOn');
    }
    if (input.interval < 1) {
      throw new BadRequestException('interval must be >= 1');
    }
    if (input.durationMinutes < 15) {
      throw new BadRequestException('durationMinutes must be >= 15');
    }

    if (input.frequency === 'monthly') {
      return this.generateMonthly(input);
    }

    if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
      throw new BadRequestException('daysOfWeek is required for weekly/biweekly');
    }
    for (const d of input.daysOfWeek) {
      if (d < 0 || d > 6 || !Number.isInteger(d)) {
        throw new BadRequestException('daysOfWeek entries must be integers 0-6');
      }
    }

    return this.generateWeekly(input);
  }

  private generateWeekly(input: SeriesGenerationInput): GeneratedOccurrence[] {
    const effectiveInterval = input.frequency === 'biweekly' ? input.interval * 2 : input.interval;

    const dayNumbers = new Set(input.daysOfWeek);
    const result: GeneratedOccurrence[] = [];

    const baseMidnight = Date.UTC(
      input.startsOn.getUTCFullYear(),
      input.startsOn.getUTCMonth(),
      input.startsOn.getUTCDate(),
    );

    let cursorMs = baseMidnight;
    const endMs = input.endsOn.getTime();

    while (cursorMs <= endMs) {
      const cursorDate = new Date(cursorMs);
      const daysSinceStart = Math.floor((cursorMs - baseMidnight) / MS_PER_DAY);
      const weekIndex = Math.floor(daysSinceStart / 7);

      if (weekIndex % effectiveInterval === 0 && dayNumbers.has(cursorDate.getUTCDay())) {
        const occurrenceStart = new Date(
          Date.UTC(
            cursorDate.getUTCFullYear(),
            cursorDate.getUTCMonth(),
            cursorDate.getUTCDate(),
            input.startHour,
            input.startMinute,
          ),
        );
        const occurrenceEnd = new Date(occurrenceStart.getTime() + input.durationMinutes * 60_000);
        if (
          occurrenceStart.getTime() >= input.startsOn.getTime() &&
          occurrenceStart.getTime() <= endMs
        ) {
          result.push({ startsAt: occurrenceStart, endsAt: occurrenceEnd });
        }
      }

      cursorMs += MS_PER_DAY;
    }

    return result;
  }

  private generateMonthly(input: SeriesGenerationInput): GeneratedOccurrence[] {
    const result: GeneratedOccurrence[] = [];
    const targetDay = input.startsOn.getUTCDate();

    let year = input.startsOn.getUTCFullYear();
    let month = input.startsOn.getUTCMonth();
    const endMs = input.endsOn.getTime();

    // Safeguard: cap iterations at 240 months (20 years) to prevent runaway loops
    for (let i = 0; i < 240; i++) {
      // CRITICAL: avoid JS Date overflow — clamp target day to daysInMonth
      const effectiveDay = Math.min(targetDay, daysInMonth(year, month));
      const occurrenceStart = new Date(
        Date.UTC(year, month, effectiveDay, input.startHour, input.startMinute),
      );

      if (occurrenceStart.getTime() > endMs) break;
      if (occurrenceStart.getTime() >= input.startsOn.getTime()) {
        const occurrenceEnd = new Date(occurrenceStart.getTime() + input.durationMinutes * 60_000);
        result.push({ startsAt: occurrenceStart, endsAt: occurrenceEnd });
      }

      month += input.interval;
      while (month >= 12) {
        month -= 12;
        year += 1;
      }
    }

    return result;
  }
}
