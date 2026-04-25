import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { BookingFacade } from '../public/booking.facade';
import { CreateBookingSeriesSchema } from './dtos/create-booking-series.dto';
import { CancelBookingSeriesSchema } from './dtos/cancel-booking-series.dto';

@Controller('klubs/:klubId/booking-series')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingSeriesController {
  constructor(private readonly facade: BookingFacade) {}

  @Post()
  @RequirePolicy('booking.create', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async create(
    @Param('klubId') klubId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateBookingSeriesSchema.parse(body);
    const isStaff = await this.facade.userIsStaffOfKlub(user.userId, klubId);
    return this.facade.createBookingSeries({
      klubId,
      spaceId: dto.spaceId,
      frequency: dto.frequency,
      interval: dto.interval,
      daysOfWeek: dto.daysOfWeek,
      startsOn: new Date(dto.startsOn),
      endsOn: new Date(dto.endsOn),
      startHour: dto.startHour,
      startMinute: dto.startMinute,
      durationMinutes: dto.durationMinutes,
      bookingType: dto.bookingType,
      primaryPlayerId: dto.primaryPlayerId ?? user.userId,
      otherPlayers: dto.otherPlayers,
      notes: dto.notes,
      createdById: user.userId,
      createdByIsStaff: isStaff,
    });
  }
}

@Controller('booking-series/:seriesId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingSeriesActionsController {
  constructor(private readonly facade: BookingFacade) {}

  @Delete()
  async cancel(
    @Param('seriesId') seriesId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CancelBookingSeriesSchema.parse(body);
    const series = await this.facade.getBookingSeries(seriesId);
    const isStaff = await this.facade.userIsStaffOfKlub(user.userId, series.klubId);
    return this.facade.cancelBookingSeries({
      seriesId,
      mode: dto.mode,
      bookingId: dto.bookingId,
      cancelledById: user.userId,
      isStaff,
      reason: dto.reason,
    });
  }
}
