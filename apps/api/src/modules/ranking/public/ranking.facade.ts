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
import { ListRankingsHandler } from '../application/queries/list-rankings.handler';
import { GetRankingHandler } from '../application/queries/get-ranking.handler';
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
}
