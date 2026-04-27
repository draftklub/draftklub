import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { KlubFacade } from '../public/klub.facade';

/**
 * Sprint C — endpoints user-side pra solicitações de entrada.
 * `GET /me/membership-requests` lista as do user atual; `DELETE
 * /me/membership-requests/:id` cancela (só pendentes).
 *
 * Sem `@RequirePolicy` (qualquer auth user pode ver/cancelar as próprias
 * solicitações; handler valida ownership).
 */
@Controller('me/membership-requests')
@UseGuards(FirebaseAuthGuard)
export class MeMembershipRequestsController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.listMyMembershipRequests(user.userId);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.cancelMyMembershipRequest({ requestId: id, userId: user.userId });
  }
}
