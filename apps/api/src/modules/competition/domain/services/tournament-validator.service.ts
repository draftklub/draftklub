import { Injectable, BadRequestException } from '@nestjs/common';

export interface TournamentDates {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawDate: Date;
  prequalifierStartDate?: Date | null;
  prequalifierEndDate?: Date | null;
  mainStartDate: Date;
  mainEndDate?: Date | null;
}

@Injectable()
export class TournamentValidatorService {
  validateDates(dates: TournamentDates, hasPrequalifiers: boolean): void {
    const errors: string[] = [];

    if (dates.registrationOpensAt >= dates.registrationClosesAt) {
      errors.push('registrationOpensAt must be before registrationClosesAt');
    }
    if (dates.registrationClosesAt > dates.drawDate) {
      errors.push('registrationClosesAt must be before or equal to drawDate');
    }

    if (hasPrequalifiers) {
      if (!dates.prequalifierStartDate || !dates.prequalifierEndDate) {
        errors.push('prequalifierStartDate and prequalifierEndDate required when hasPrequalifiers=true');
      } else {
        if (dates.drawDate > dates.prequalifierStartDate) {
          errors.push('prequalifierStartDate must be after drawDate');
        }
        if (dates.prequalifierStartDate >= dates.prequalifierEndDate) {
          errors.push('prequalifierStartDate must be before prequalifierEndDate');
        }
        if (dates.prequalifierEndDate > dates.mainStartDate) {
          errors.push('prequalifierEndDate must be before or equal to mainStartDate');
        }
      }
    } else {
      if (dates.drawDate > dates.mainStartDate) {
        errors.push('drawDate must be before or equal to mainStartDate');
      }
    }

    if (dates.mainEndDate && dates.mainStartDate >= dates.mainEndDate) {
      errors.push('mainStartDate must be before mainEndDate');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid tournament dates',
        errors,
      });
    }
  }

  validatePrequalifierConfig(
    hasPrequalifiers: boolean,
    bordersPerFrontier: number | null | undefined,
    numCategories: number,
  ): void {
    if (!hasPrequalifiers) return;

    if (bordersPerFrontier == null || bordersPerFrontier < 1) {
      throw new BadRequestException(
        'prequalifierBordersPerFrontier must be >= 1 when hasPrequalifiers=true',
      );
    }

    if (numCategories < 2) {
      throw new BadRequestException(
        'Prequalifiers require at least 2 categories',
      );
    }
  }
}
