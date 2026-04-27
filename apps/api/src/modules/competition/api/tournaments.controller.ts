import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';
import { CreateTournamentSchema } from './dtos/create-tournament.dto';

@Controller('klubs/:klubId/sports/:sportCode/tournaments')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentsController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Get()
  async list(@Param('klubId') klubId: string, @Param('sportCode') sportCode: string) {
    return this.facade.listTournaments(klubId, sportCode);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.facade.getTournament(id);
  }

  @Post()
  @RequirePolicy('tournament.create', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async create(
    @Param('klubId') klubId: string,
    @Param('sportCode') sportCode: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateTournamentSchema.parse(body);
    return this.facade.createTournament({
      klubId,
      sportCode,
      ...dto,
      createdById: user.userId,
    });
  }
}
