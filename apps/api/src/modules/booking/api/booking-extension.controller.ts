import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { BookingFacade } from '../public/booking.facade';
import {
  ExtendBookingDto,
  ExtendBookingSchema,
  RejectExtensionDto,
  RejectExtensionSchema,
} from './dtos/extend-booking.dto';

@Controller('bookings/:bookingId/extensions')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingExtensionController {
  constructor(private readonly facade: BookingFacade) {}

  @Post()
  async extend(
    @Param('bookingId') bookingId: string,
    @Body() body: ExtendBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ExtendBookingSchema.parse(body);
    const booking = await this.facade.getBooking(bookingId);
    const isStaff = await this.facade.userIsStaffOfKlub(user.userId, booking.klubId);
    return this.facade.extendBooking({
      bookingId,
      additionalMinutes: dto.additionalMinutes,
      notes: dto.notes,
      requestedById: user.userId,
      isStaff,
    });
  }
}

@Controller('klubs/:klubId/extensions')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubExtensionsController {
  constructor(private readonly facade: BookingFacade) {}

  @Get('pending')
  @RequirePolicy('booking.approve', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async listPending(@Param('klubId') klubId: string) {
    return this.facade.listPendingExtensions(klubId);
  }
}

@Controller('bookings/:bookingId/extensions/:extensionId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingExtensionActionsController {
  constructor(private readonly facade: BookingFacade) {}

  @Patch('approve')
  @RequirePolicy('booking.approve', { resolveKlubIdFrom: 'booking:bookingId' })
  async approve(
    @Param('bookingId') bookingId: string,
    @Param('extensionId') extensionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.approveExtension({
      bookingId,
      extensionId,
      approvedById: user.userId,
    });
  }

  @Patch('reject')
  @RequirePolicy('booking.approve', { resolveKlubIdFrom: 'booking:bookingId' })
  async reject(
    @Param('bookingId') bookingId: string,
    @Param('extensionId') extensionId: string,
    @Body() body: RejectExtensionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RejectExtensionSchema.parse(body ?? {});
    return this.facade.rejectExtension({
      bookingId,
      extensionId,
      rejectedById: user.userId,
      reason: dto.reason,
    });
  }
}
