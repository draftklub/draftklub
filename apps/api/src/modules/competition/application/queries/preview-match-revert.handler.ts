import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface RatingDeltaPreview {
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  toRevert: number;
}

export interface AffectedMatch {
  id: string;
  bracketPosition: string;
  phase: string;
  status: string;
  willRevertTo: 'scheduled' | 'TBD slot';
}

export interface PreviewRevertResult {
  matchId: string;
  cascade: {
    affectedMatches: AffectedMatch[];
    ratingDeltas: RatingDeltaPreview[];
    warnings: string[];
  };
}

@Injectable()
export class PreviewMatchRevertHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(matchId: string): Promise<PreviewRevertResult> {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Tournament match not found');

    if (match.status !== 'completed' || !match.winnerId) {
      throw new BadRequestException('Only completed matches with a winner can be reverted');
    }

    const warnings: string[] = [];
    const affected: AffectedMatch[] = [
      {
        id: match.id,
        bracketPosition: match.bracketPosition,
        phase: match.phase,
        status: match.status,
        willRevertTo: 'scheduled',
      },
    ];

    if (match.matchKind === 'prequalifier') {
      warnings.push('prequalifier_dual_path_warning');
    }

    if (match.nextMatchId) {
      const next = await this.prisma.tournamentMatch.findUnique({
        where: { id: match.nextMatchId },
      });
      if (next) {
        affected.push({
          id: next.id,
          bracketPosition: next.bracketPosition,
          phase: next.phase,
          status: next.status,
          willRevertTo: next.status === 'completed' ? 'scheduled' : 'TBD slot',
        });

        if (next.status === 'completed' && next.nextMatchId) {
          const nextNext = await this.prisma.tournamentMatch.findUnique({
            where: { id: next.nextMatchId },
            select: { status: true },
          });
          if (nextNext?.status === 'completed') {
            warnings.push('cascade_depth_exceeded_1_level');
          }
        }
      }
    }

    const ratingDeltas: RatingDeltaPreview[] = [];
    if (match.matchResultId) {
      const result = await this.prisma.matchResult.findUnique({
        where: { id: match.matchResultId },
      });
      if (result?.status === 'confirmed') {
        if (
          result.player1RatingBefore != null &&
          result.player1RatingAfter != null
        ) {
          const delta = result.player1RatingAfter - result.player1RatingBefore;
          ratingDeltas.push({
            userId: result.player1Id,
            ratingBefore: result.player1RatingBefore,
            ratingAfter: result.player1RatingAfter,
            delta,
            toRevert: -delta,
          });
        }
        if (
          result.player2RatingBefore != null &&
          result.player2RatingAfter != null
        ) {
          const delta = result.player2RatingAfter - result.player2RatingBefore;
          ratingDeltas.push({
            userId: result.player2Id,
            ratingBefore: result.player2RatingBefore,
            ratingAfter: result.player2RatingAfter,
            delta,
            toRevert: -delta,
          });
        }
      }
    }

    return {
      matchId,
      cascade: { affectedMatches: affected, ratingDeltas, warnings },
    };
  }
}
