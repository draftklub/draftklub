import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { BookingFacade } from '../public/booking.facade';
import { CreateBookingSchema } from './dtos/create-booking.dto';

@Controller('klubs/:klubId/bookings')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class BookingController {
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
    const dto = CreateBookingSchema.parse(body);
    const isStaff = await this.facade.userIsStaffOfKlub(user.userId, klubId);
    return this.facade.createBooking({
      klubId,
      spaceId: dto.spaceId,
      startsAt: new Date(dto.startsAt),
      matchType: dto.matchType,
      bookingType: dto.bookingType,
      primaryPlayerId: dto.primaryPlayerId ?? user.userId,
      otherPlayers: dto.otherPlayers,
      responsibleMemberId: dto.responsibleMemberId,
      notes: dto.notes,
      createdById: user.userId,
      createdByIsStaff: isStaff,
    });
  }

  @Get()
  async list(
    @Param('klubId') klubId: string,
    @Query('spaceId') spaceId?: string,
    @Query('startsAfter') startsAfter?: string,
    @Query('startsBefore') startsBefore?: string,
    @Query('status') status?: string,
    @Query('primaryPlayerId') primaryPlayerId?: string,
  ) {
    return this.facade.listBookings({
      klubId,
      spaceId,
      startsAfter: startsAfter ? new Date(startsAfter) : undefined,
      startsBefore: startsBefore ? new Date(startsBefore) : undefined,
      status,
      primaryPlayerId,
    });
  }
}
