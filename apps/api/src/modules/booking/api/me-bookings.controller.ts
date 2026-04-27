import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { BookingFacade } from '../public/booking.facade';

/**
 * Sprint Polish PR-B — endpoint user-side cross-klub. Identity nao
 * importa BookingModule, entao o controller mora aqui (mesmo padrao
 * de MeMembershipRequestsController em Klub). Sem `@RequirePolicy`:
 * qualquer auth user lista as proprias reservas.
 */
@Controller('me/bookings')
@UseGuards(FirebaseAuthGuard)
export class MeBookingsController {
  constructor(private readonly bookingFacade: BookingFacade) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingFacade.listMyBookings(user.userId);
  }
}
