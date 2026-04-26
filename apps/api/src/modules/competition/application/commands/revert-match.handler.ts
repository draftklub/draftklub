import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  PreviewMatchRevertHandler,
  type PreviewRevertResult,
} from '../queries/preview-match-revert.handler';

export interface RevertMatchCommand {
  matchId: string;
  revertedById: string;
  reason?: string;
}

interface PreviousState {
  winnerId: string | null;
  matchResultId: string | null;
  status: string;
  completedAt: string | null;
  ratingDeltas: PreviewRevertResult['cascade']['ratingDeltas'];
  nextMatchAffected: {
    id: string;
    slot: 'top' | 'bottom';
    hadCompleted: boolean;
  } | null;
  warnings: string[];
}

@Injectable()
export class RevertMatchHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previewHandler: PreviewMatchRevertHandler,
  ) {}

  async execute(cmd: RevertMatchCommand) {
    const preview = await this.previewHandler.execute(cmd.matchId);

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.tournamentMatch.findUnique({
        where: { id: cmd.matchId },
      });
      if (!match) throw new NotFoundException('Tournament match not found');
      if (match.status !== 'completed' || !match.winnerId) {
        throw new BadRequestException(
          'Match state changed since preview — only completed matches with winner can be reverted',
        );
      }

      const slot: 'top' | 'bottom' | null =
        match.nextMatchSlot === 'top' || match.nextMatchSlot === 'bottom'
          ? match.nextMatchSlot
          : null;

      let nextMatchAffected: PreviousState['nextMatchAffected'] = null;
      if (match.nextMatchId && slot) {
        const next = await tx.tournamentMatch.findUnique({
          where: { id: match.nextMatchId },
        });
        if (next) {
          nextMatchAffected = {
            id: next.id,
            slot,
            hadCompleted: next.status === 'completed',
          };
        }
      }

      const previousState: PreviousState = {
        winnerId: match.winnerId,
        matchResultId: match.matchResultId,
        status: match.status,
        completedAt: match.completedAt?.toISOString() ?? null,
        ratingDeltas: preview.cascade.ratingDeltas,
        nextMatchAffected,
        warnings: preview.cascade.warnings,
      };

      const revert = await tx.tournamentMatchRevert.create({
        data: {
          tournamentMatchId: cmd.matchId,
          revertedById: cmd.revertedById,
          reason: cmd.reason,
          previousState: previousState as unknown as Prisma.InputJsonValue,
        },
      });

      // 1. Reverte rating deltas via PlayerRankingEntry
      if (preview.cascade.ratingDeltas.length > 0) {
        const tournament = await tx.tournament.findUnique({
          where: { id: match.tournamentId },
          select: { rankingId: true },
        });
        if (tournament) {
          for (const delta of preview.cascade.ratingDeltas) {
            await tx.playerRankingEntry.updateMany({
              where: { rankingId: tournament.rankingId, userId: delta.userId },
              data: { rating: { increment: delta.toRevert } },
            });
          }
        }
      }

      // 2. Volta match a scheduled
      await tx.tournamentMatch.update({
        where: { id: cmd.matchId },
        data: {
          status: 'scheduled',
          winnerId: null,
          matchResultId: null,
          completedAt: null,
        },
      });

      // 3. MatchResult vinculado: status='reverted' (preserva historico)
      if (match.matchResultId) {
        await tx.matchResult.update({
          where: { id: match.matchResultId },
          data: { status: 'reverted' },
        });
      }

      // 4. Cascade: limpa slot do nextMatch (winner-source slot)
      if (nextMatchAffected) {
        const slotField = nextMatchAffected.slot === 'top' ? 'player1Id' : 'player2Id';
        const updateData: Record<string, unknown> = { [slotField]: null };
        if (nextMatchAffected.hadCompleted) {
          // Limitação MVP: cascade só 1 nível.
          // Se o nextMatch já tinha completado, voltamos pra scheduled mas
          // NÃO recursionamos em next.nextMatch.
          updateData.status = 'scheduled';
          updateData.winnerId = null;
          updateData.matchResultId = null;
          updateData.completedAt = null;
        }
        await tx.tournamentMatch.update({
          where: { id: nextMatchAffected.id },
          data: updateData,
        });
      }

      return {
        revert,
        affectedMatches: preview.cascade.affectedMatches,
        warnings: preview.cascade.warnings,
      };
    });
  }
}
