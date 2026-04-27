import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { BookingFacade } from '../public/booking.facade';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Controller('klubs/:klubId/calendar')
@UseGuards(FirebaseAuthGuard)
export class KlubCalendarController {
  constructor(private readonly facade: BookingFacade) {}

  @Get()
  async getCalendar(@Param('klubId') klubId: string, @Query('date') date: string) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    return this.facade.getKlubCalendar(klubId, date);
  }
}
