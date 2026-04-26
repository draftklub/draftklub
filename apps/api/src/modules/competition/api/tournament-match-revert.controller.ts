import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';

const RevertBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

@Controller('tournament-matches/:matchId/revert')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class TournamentMatchRevertController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Get('preview')
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament-match:matchId' })
  async preview(@Param('matchId') matchId: string) {
    return this.facade.previewMatchRevert(matchId);
  }

  @Post()
  @RequirePolicy('tournament.manage', { resolveKlubIdFrom: 'tournament-match:matchId' })
  async revert(
    @Param('matchId') matchId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RevertBodySchema.parse(body ?? {});
    return this.facade.revertMatch({
      matchId,
      revertedById: user.userId,
      reason: dto.reason,
    });
  }
}
