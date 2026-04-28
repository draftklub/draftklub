import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateRankingHandler,
  type CreateRankingCommand,
} from '../application/commands/create-ranking.handler';
import {
  EnrollPlayerHandler,
  type EnrollPlayerCommand,
} from '../application/commands/enroll-player.handler';
import {
  SubmitMatchHandler,
  type SubmitMatchCommand,
} from '../application/commands/submit-match.handler';
import {
  ConfirmMatchHandler,
  type ConfirmMatchCommand,
} from '../application/commands/confirm-match.handler';
import {
  UpdateRankingHandler,
  type UpdateRankingCommand,
} from '../application/commands/update-ranking.handler';
import { ListRankingsHandler } from '../application/queries/list-rankings.handler';
import { GetRankingHandler } from '../application/queries/get-ranking.handler';
import { ListPendingMatchConfirmationsHandler } from '../application/queries/list-pending-match-confirmations.handler';
import { RankingRecomputeService } from '../domain/services/ranking-recompute.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface CreateRankingWithKlubCommand extends Omit<CreateRankingCommand, 'klubSportId'> {
  klubId: string;
  sportCode: string;
}

@Injectable()
export class RankingFacade {
  constructor(
    private readonly createRankingHandler: CreateRankingHandler,
    private readonly enrollPlayerHandler: EnrollPlayerHandler,
    private readonly submitMatchHandler: SubmitMatchHandler,
    private readonly confirmMatchHandler: ConfirmMatchHandler,
    private readonly listRankingsHandler: ListRankingsHandler,
    private readonly getRankingHandler: GetRankingHandler,
    private readonly updateRankingHandler: UpdateRankingHandler,
    private readonly listPendingConfirmationsHandler: ListPendingMatchConfirmationsHandler,
    private readonly recomputeService: RankingRecomputeService,
    private readonly prisma: PrismaService,
  ) {}

  async createRanking(cmd: CreateRankingWithKlubCommand) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { klubId_sportCode: { klubId: cmd.klubId, sportCode: cmd.sportCode } },
    });
    if (!profile) {
      throw new NotFoundException(`Sport ${cmd.sportCode} not active in Klub ${cmd.klubId}`);
    }
    const { klubId: _klubId, sportCode: _sportCode, ...rest } = cmd;
    return this.createRankingHandler.execute({ ...rest, klubSportId: profile.id });
  }

  async listRankings(klubId: string, sportCode: string) {
    return this.listRankingsHandler.execute(klubId, sportCode);
  }

  async getRanking(rankingId: string) {
    return this.getRankingHandler.execute(rankingId);
  }

  async enrollPlayer(cmd: EnrollPlayerCommand) {
    return this.enrollPlayerHandler.execute(cmd);
  }

  async submitMatch(cmd: SubmitMatchCommand) {
    return this.submitMatchHandler.execute(cmd);
  }

  async confirmMatch(cmd: ConfirmMatchCommand) {
    return this.confirmMatchHandler.execute(cmd);
  }

  async updateRanking(cmd: UpdateRankingCommand) {
    return this.updateRankingHandler.execute(cmd);
  }

  async listPendingMatchConfirmations(userId: string) {
    return this.listPendingConfirmationsHandler.execute(userId);
  }

  async recomputeAllTemporalRankings(): Promise<{ recomputed: number }> {
    const temporal = await this.prisma.klubSportRanking.findMany({
      where: { windowType: { not: 'all_time' } },
      select: { id: true },
    });
    let count = 0;
    for (const r of temporal) {
      await this.recomputeService.recompute(r.id);
      count++;
    }
    return { recomputed: count };
  }
}
