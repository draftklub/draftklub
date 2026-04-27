import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';
import { ReportMatchSchema } from './dtos/report-match.dto';
import { WalkoverSchema, DoubleWalkoverSchema } from './dtos/walkover.dto';

@Controller('tournaments/:tournamentId/matches/:matchId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentMatchesController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Post('result')
  async report(
    @Param('tournamentId') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ReportMatchSchema.parse(body);
    const isCommittee = await this.facade.userIsCommitteeForTournament(user.userId, tournamentId);
    return this.facade.reportTournamentMatch({
      tournamentId,
      matchId,
      winnerId: dto.winnerId,
      score: dto.score,
      notes: dto.notes,
      submittedById: user.userId,
      submittedByIsCommittee: isCommittee,
    });
  }

  @Post('confirm')
  async confirm(
    @Param('tournamentId') tournamentId: string,
    @Param('matchId') matchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.confirmTournamentMatch({
      tournamentId,
      matchId,
      confirmedById: user.userId,
    });
  }

  @Patch('result')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async edit(
    @Param('tournamentId') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ReportMatchSchema.parse(body);
    return this.facade.editTournamentMatchResult({
      tournamentId,
      matchId,
      winnerId: dto.winnerId,
      score: dto.score,
      editedById: user.userId,
    });
  }

  @Post('walkover')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async walkover(
    @Param('tournamentId') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = WalkoverSchema.parse(body);
    return this.facade.applyWalkover({
      tournamentId,
      matchId,
      winnerId: dto.winnerId,
      submittedById: user.userId,
      notes: dto.notes,
    });
  }

  @Post('double-walkover')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async doubleWalkover(
    @Param('tournamentId') tournamentId: string,
    @Param('matchId') matchId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = DoubleWalkoverSchema.parse(body);
    return this.facade.applyDoubleWalkover({
      tournamentId,
      matchId,
      submittedById: user.userId,
      notes: dto.notes,
    });
  }
}
