import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { SportsFacade } from '../public/sports.facade';
import { ActivateSportSchema } from './dtos/activate-sport.dto';

@Controller('klubs/:klubId/sports')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubSportsController {
  constructor(private readonly facade: SportsFacade) {}

  @Get()
  async listKlubSports(@Param('klubId') klubId: string) {
    return this.facade.listKlubSports(klubId);
  }

  @Get(':code')
  async getKlubSport(
    @Param('klubId') klubId: string,
    @Param('code') code: string,
  ) {
    return this.facade.getKlubSport(klubId, code);
  }

  @Post(':code')
  @RequirePolicy('sport.activate', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async activateSport(
    @Param('klubId') klubId: string,
    @Param('code') code: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ActivateSportSchema.parse(body);
    return this.facade.activateSport({
      klubId,
      sportCode: code,
      ...dto,
      addedById: user.userId,
    });
  }
}
