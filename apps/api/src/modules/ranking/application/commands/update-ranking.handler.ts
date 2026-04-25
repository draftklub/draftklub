import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RankingRecomputeService } from '../../domain/services/ranking-recompute.service';

const RECOMPUTE_SYNC_THRESHOLD = 1000;

export interface UpdateRankingCommand {
  rankingId: string;
  updates: {
    name?: string;
    includesCasualMatches?: boolean;
    includesTournamentMatches?: boolean;
    includesTournamentPoints?: boolean;
    orderBy?: 'rating' | 'tournament_points' | 'combined';
    combinedWeight?: { ratingWeight: number; pointsWeight: number };
    windowType?: 'all_time' | 'season' | 'semester' | 'last_weeks' | 'last_tournaments';
    windowSize?: number;
    windowStartDate?: Date;
  };
}

export interface UpdateRankingResult {
  ranking: unknown;
  recomputeStatus: 'completed' | 'queued' | 'skipped';
  rebuiltEntries?: number;
  matchCount?: number;
}

@Injectable()
export class UpdateRankingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recomputeService: RankingRecomputeService,
  ) {}

  async execute(cmd: UpdateRankingCommand): Promise<UpdateRankingResult> {
    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: cmd.rankingId },
    });
    if (!ranking) throw new NotFoundException('Ranking not found');

    const data: Record<string, unknown> = {};
    if (cmd.updates.name !== undefined) data.name = cmd.updates.name;
    if (cmd.updates.includesCasualMatches !== undefined) {
      data.includesCasualMatches = cmd.updates.includesCasualMatches;
    }
    if (cmd.updates.includesTournamentMatches !== undefined) {
      data.includesTournamentMatches = cmd.updates.includesTournamentMatches;
    }
    if (cmd.updates.includesTournamentPoints !== undefined) {
      data.includesTournamentPoints = cmd.updates.includesTournamentPoints;
    }
    if (cmd.updates.orderBy !== undefined) data.orderBy = cmd.updates.orderBy;
    if (cmd.updates.combinedWeight !== undefined) {
      data.combinedWeight = cmd.updates.combinedWeight;
    }
    if (cmd.updates.windowType !== undefined) data.windowType = cmd.updates.windowType;
    if (cmd.updates.windowSize !== undefined) data.windowSize = cmd.updates.windowSize;
    if (cmd.updates.windowStartDate !== undefined) {
      data.windowStartDate = cmd.updates.windowStartDate;
    }

    const updated = await this.prisma.klubSportRanking.update({
      where: { id: cmd.rankingId },
      data,
    });

    const recomputeTriggered =
      cmd.updates.includesCasualMatches !== undefined ||
      cmd.updates.includesTournamentMatches !== undefined ||
      cmd.updates.includesTournamentPoints !== undefined ||
      cmd.updates.windowType !== undefined ||
      cmd.updates.windowSize !== undefined ||
      cmd.updates.windowStartDate !== undefined;

    if (!recomputeTriggered) {
      return { ranking: updated, recomputeStatus: 'skipped' };
    }

    const matchCount = await this.prisma.matchResult.count({
      where: { rankingId: cmd.rankingId },
    });

    if (matchCount >= RECOMPUTE_SYNC_THRESHOLD) {
      return { ranking: updated, recomputeStatus: 'queued', matchCount };
    }

    const result = await this.recomputeService.recompute(cmd.rankingId);
    return {
      ranking: updated,
      recomputeStatus: 'completed',
      rebuiltEntries: result.rebuiltEntries,
      matchCount,
    };
  }
}
