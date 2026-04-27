import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { RankingFacade } from '../public/ranking.facade';
import { SubmitMatchSchema } from './dtos/submit-match.dto';

@Controller('matches')
@UseGuards(FirebaseAuthGuard)
export class MatchesController {
  constructor(private readonly facade: RankingFacade) {}

  @Post()
  async submitMatch(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const dto = SubmitMatchSchema.parse(body);
    return this.facade.submitMatch({ ...dto, submittedById: user.userId });
  }

  @Post(':id/confirm')
  async confirmMatch(@Param('id') matchId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.facade.confirmMatch({ matchId, confirmedById: user.userId });
  }
}
