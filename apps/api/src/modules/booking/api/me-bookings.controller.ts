import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CursorPaginationSchema } from '../../../shared/pagination/cursor';
import { BookingFacade } from '../public/booking.facade';

/**
 * Sprint Polish PR-B — endpoint user-side cross-klub. Identity nao
 * importa BookingModule, entao o controller mora aqui (mesmo padrao
 * de MeMembershipRequestsController em Klub). Sem `@RequirePolicy`:
 * qualquer auth user lista as proprias reservas.
 *
 * Sprint N batch 4 — cursor pagination. Aceita `?cursor=&limit=` e
 * retorna `{ items, nextCursor }`. Default limit=50, max 200.
 */
@Controller('me/bookings')
@UseGuards(FirebaseAuthGuard)
export class MeBookingsController {
  constructor(private readonly bookingFacade: BookingFacade) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    const params = CursorPaginationSchema.parse(query);
    return this.bookingFacade.listMyBookings(user.userId, params);
  }
}
