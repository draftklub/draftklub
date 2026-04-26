import {
  Controller,
  Get,
  Patch,
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
import {
  ApproveBookingSchema,
  RejectBookingSchema,
  CancelBookingSchema,
} from './dtos/booking-actions.dto';

@Controller('bookings/:bookingId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingActionsController {
  constructor(private readonly facade: BookingFacade) {}

  @Get()
  async get(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.getBookingForViewer(bookingId, user.userId);
  }

  @Patch('approve')
  @RequirePolicy('booking.approve', { resolveKlubIdFrom: 'booking:bookingId' })
  async approve(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ApproveBookingSchema.parse(body);
    return this.facade.approveBooking({
      bookingId,
      approvedById: user.userId,
      notes: dto.notes,
    });
  }

  @Patch('reject')
  @RequirePolicy('booking.approve', { resolveKlubIdFrom: 'booking:bookingId' })
  async reject(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RejectBookingSchema.parse(body);
    return this.facade.rejectBooking({
      bookingId,
      rejectedById: user.userId,
      reason: dto.reason,
    });
  }

  @Delete()
  async cancel(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CancelBookingSchema.parse(body);
    const booking = await this.facade.getBooking(bookingId);
    const isStaff = await this.facade.userIsStaffOfKlub(user.userId, booking.klubId);
    return this.facade.cancelBooking({
      bookingId,
      cancelledById: user.userId,
      isStaff,
      reason: dto.reason,
    });
  }
}
