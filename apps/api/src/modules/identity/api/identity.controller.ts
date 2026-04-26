import { Controller, Get, UseGuards } from '@nestjs/common';
import type { MeResponse, UserKlubMembership } from '@draftklub/shared-types';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { GetMyKlubsHandler } from '../application/queries/get-my-klubs.handler';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class IdentityController {
  constructor(private readonly getMyKlubs: GetMyKlubsHandler) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): MeResponse {
    return {
      id: user.userId,
      email: user.email,
      firebaseUid: user.firebaseUid,
      roleAssignments: user.roleAssignments,
    };
  }

  /**
   * Lista de Klubs do user logado, com role mais alta por Klub.
   * Usado pelo post-login router (1 → dashboard direto, N → picker)
   * e pelo Klub switcher inline. Filtra Klubs soft-deleted.
   */
  @Get('me/klubs')
  async listMyKlubs(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserKlubMembership[]> {
    return this.getMyKlubs.execute(user.userId);
  }
}
