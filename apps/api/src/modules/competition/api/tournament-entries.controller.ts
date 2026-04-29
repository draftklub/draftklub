import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';
import { MoveEntrySchema } from './dtos/move-entry.dto';

@Controller('tournaments/:tournamentId/entries')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentEntriesController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Get()
  @RequirePolicy('tournament.read', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async list(@Param('tournamentId') tournamentId: string) {
    return this.facade.listEntries(tournamentId);
  }

  @Post()
  @RequirePolicy('tournament.enroll', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async register(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.registerEntry({
      tournamentId,
      userId: user.userId,
    });
  }

  @Delete('me')
  @RequirePolicy('tournament.withdraw', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async withdraw(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.withdrawEntry({
      tournamentId,
      userId: user.userId,
      requestingUserId: user.userId,
    });
  }

  @Post(':entryId/approve')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async approve(
    @Param('tournamentId') tournamentId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.approveEntry({
      tournamentId,
      entryId,
      approvedById: user.userId,
    });
  }

  @Patch(':entryId/category')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament:tournamentId' })
  async moveCategory(
    @Param('tournamentId') tournamentId: string,
    @Param('entryId') entryId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = MoveEntrySchema.parse(body);
    return this.facade.moveEntryCategory({
      tournamentId,
      entryId,
      targetCategoryId: dto.targetCategoryId,
      asWildCard: dto.asWildCard,
      movedById: user.userId,
    });
  }
}
