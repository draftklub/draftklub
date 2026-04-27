import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { MeResponse, UserKlubMembership } from '@draftklub/shared-types';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { GetMeHandler } from '../application/queries/get-me.handler';
import { GetMyKlubsHandler } from '../application/queries/get-my-klubs.handler';
import { UpdateMeHandler } from '../application/commands/update-me.handler';
import { UpdateMeSchema } from './dtos/update-me.dto';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class IdentityController {
  constructor(
    private readonly getMe: GetMeHandler,
    private readonly updateMe: UpdateMeHandler,
    private readonly getMyKlubs: GetMyKlubsHandler,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.getMe.execute(user.userId, user.roleAssignments);
  }

  /**
   * PATCH /me — atualiza campos editáveis do user (nome, phone,
   * birthDate, gender, city, state, avatarUrl). Sempre opera sobre
   * `user.userId` do contexto Firebase — body não pode mudar outro user.
   */
  @Patch('me')
  async patchMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    const dto = UpdateMeSchema.parse(body);
    return this.updateMe.execute({
      userId: user.userId,
      roleAssignments: user.roleAssignments,
      dto,
    });
  }

  /**
   * Lista de Klubs do user logado, com role mais alta por Klub.
   * Usado pelo post-login router (1 → dashboard direto, N → picker)
   * e pelo Klub switcher inline. Filtra Klubs soft-deleted.
   */
  @Get('me/klubs')
  async listMyKlubs(@CurrentUser() user: AuthenticatedUser): Promise<UserKlubMembership[]> {
    return this.getMyKlubs.execute(user.userId);
  }
}
