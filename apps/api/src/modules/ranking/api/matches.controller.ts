import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { RankingFacade } from '../public/ranking.facade';
import { SubmitMatchSchema } from './dtos/submit-match.dto';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class MatchesController {
  constructor(private readonly facade: RankingFacade) {}

  @Post('matches')
  async submitMatch(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const dto = SubmitMatchSchema.parse(body);
    return this.facade.submitMatch({ ...dto, submittedById: user.userId });
  }

  @Post('matches/:id/confirm')
  async confirmMatch(@Param('id') matchId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facade.confirmMatch({ matchId, confirmedById: user.userId });
  }

  /**
   * Sprint K PR-K5a — lista matches pending_confirmation onde caller é
   * um dos players (e não o submitter). Cobre casual + tournament. Sem
   * essa rota, frontend não tinha como descobrir matchId pra confirmar.
   */
  @Get('me/pending-match-confirmations')
  async listPendingConfirmations(@CurrentUser() user: AuthenticatedUser) {
    return this.facade.listPendingMatchConfirmations(user.userId);
  }
}
