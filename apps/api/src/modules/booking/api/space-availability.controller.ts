import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { BookingFacade } from '../public/booking.facade';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Controller('spaces/:spaceId/availability')
@UseGuards(FirebaseAuthGuard)
export class SpaceAvailabilityController {
  constructor(private readonly facade: BookingFacade) {}

  @Get()
  async getAvailability(
    @Param('spaceId') spaceId: string,
    @Query('date') date: string,
    @Query('matchType') matchType?: string,
  ) {
    if (!date || !DATE_REGEX.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    if (matchType && matchType !== 'singles' && matchType !== 'doubles') {
      throw new BadRequestException('matchType must be singles or doubles');
    }
    return this.facade.getSpaceAvailability(spaceId, date, matchType as 'singles' | 'doubles' | undefined);
  }
}
