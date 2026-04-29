import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { MeResponse, UserKlubMembership } from '@draftklub/shared-types';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { GetMeHandler } from '../application/queries/get-me.handler';
import { GetMyKlubsHandler } from '../application/queries/get-my-klubs.handler';
import { UpdateMeHandler } from '../application/commands/update-me.handler';
import { RecordConsentHandler } from '../application/commands/record-consent.handler';
import { ExportMyDataHandler } from '../application/queries/export-my-data.handler';
import { DeleteMyAccountHandler } from '../application/commands/delete-my-account.handler';
import { UpdateMeSchema } from './dtos/update-me.dto';

const ConsentSchema = z.object({
  // 'YYYY-MM-DD-vN' — versão da política aceita.
  version: z
    .string()
    .min(5)
    .max(40)
    .regex(/^\d{4}-\d{2}-\d{2}-v\d+$/, 'Formato esperado: YYYY-MM-DD-vN'),
});

@Controller()
@UseGuards(FirebaseAuthGuard)
export class IdentityController {
  constructor(
    private readonly getMe: GetMeHandler,
    private readonly updateMe: UpdateMeHandler,
    private readonly getMyKlubs: GetMyKlubsHandler,
    private readonly recordConsent: RecordConsentHandler,
    private readonly exportMyData: ExportMyDataHandler,
    private readonly deleteMyAccount: DeleteMyAccountHandler,
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

  /**
   * Sprint M batch 8 — LGPD consent capture.
   * POST /me/consent { version: 'YYYY-MM-DD-vN' }
   */
  @Post('me/consent')
  async consent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<{ consentGivenAt: string; version: string }> {
    const dto = ConsentSchema.parse(body);
    return this.recordConsent.execute({ userId: user.userId, version: dto.version });
  }

  /**
   * LGPD Art. 18 V — direito de portabilidade.
   * GET /me/export → JSON com TODOS os dados pessoais do User.
   */
  @Get('me/export')
  async exportData(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.exportMyData.execute(user.userId);
  }

  /**
   * LGPD Art. 18 VI — direito de exclusão.
   * DELETE /me → anonimiza User (mantém id pra integridade referencial
   * em bookings/tournaments). Cliente é responsável por deletar Firebase
   * user separado.
   */
  @Delete('me')
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; anonymizedAt: string }> {
    return this.deleteMyAccount.execute(user.userId);
  }
}
