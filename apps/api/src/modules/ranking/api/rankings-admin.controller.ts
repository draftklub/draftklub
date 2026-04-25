import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { RankingFacade } from '../public/ranking.facade';
import { UpdateRankingSchema } from './dtos/update-ranking.dto';

@Controller('rankings')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class RankingsAdminController {
  constructor(private readonly facade: RankingFacade) {}

  @Patch(':id')
  @RequirePolicy('ranking.update', { resolveKlubIdFrom: 'ranking:id' })
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateRankingSchema.parse(body);
    return this.facade.updateRanking({ rankingId: id, updates: dto });
  }
}
