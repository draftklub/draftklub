import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';

const CancelTournamentBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

@Controller('tournaments/:tournamentId/cancel')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentCancelController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Post()
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async cancel(
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CancelTournamentBodySchema.parse(body ?? {});
    return this.facade.cancelTournament({
      tournamentId,
      cancelledById: user.userId,
      reason: dto.reason,
    });
  }
}
