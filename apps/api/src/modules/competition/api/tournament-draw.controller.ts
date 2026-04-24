import { Controller, Post, Patch, Get, Param, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';

const UpdateReportingModeSchema = z.object({
  mode: z.enum(['committee_only', 'player_with_confirm']),
});

@Controller('tournaments/:tournamentId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentDrawController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Post('draw')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async draw(@Param('tournamentId') tournamentId: string) {
    return this.facade.drawTournament(tournamentId);
  }

  @Get('bracket')
  async getBracket(@Param('tournamentId') tournamentId: string) {
    return this.facade.getBracket(tournamentId);
  }

  @Patch('reporting-mode')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async updateReportingMode(
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = UpdateReportingModeSchema.parse(body);
    return this.facade.updateReportingMode({
      tournamentId,
      mode: dto.mode,
      updatedById: user.userId,
    });
  }
}
