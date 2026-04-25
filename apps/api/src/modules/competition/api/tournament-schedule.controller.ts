import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CompetitionFacade } from '../public/competition.facade';
import { ScheduleConfigSchema } from './dtos/schedule-config.dto';

@Controller('tournaments/:tournamentId/schedule')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentScheduleController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Post()
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async schedule(
    @Param('tournamentId') tournamentId: string,
    @Body() body: unknown,
  ) {
    const hasConfig = body && typeof body === 'object' && Object.keys(body).length > 0;
    const config = hasConfig ? ScheduleConfigSchema.parse(body) : undefined;
    return this.facade.scheduleTournament({ tournamentId, config });
  }
}
