import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetBracketHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            matches: {
              orderBy: [{ matchKind: 'desc' }, { round: 'asc' }, { bracketPosition: 'asc' }],
              include: {
                matchResult: {
                  select: {
                    id: true,
                    status: true,
                    score: true,
                    isWalkover: true,
                    confirmedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      status: tournament.status,
      currentPhase: tournament.currentPhase,
      format: tournament.format,
      hasPrequalifiers: tournament.hasPrequalifiers,
      resultReportingMode: tournament.resultReportingMode,
      categories: tournament.categories.map((cat) => {
        const prequalifierMatches = cat.matches.filter((m) => m.matchKind === 'prequalifier');
        const mainMatches = cat.matches.filter((m) => m.matchKind === 'main');

        return {
          id: cat.id,
          name: cat.name,
          order: cat.order,
          totalMainMatches: mainMatches.length,
          totalPrequalifierMatches: prequalifierMatches.length,
          prequalifiers: prequalifierMatches.map((m) => ({
            id: m.id,
            frontierUpper: m.prequalifierFrontierUpper,
            frontierLower: m.prequalifierFrontierLower,
            pairIndex: m.prequalifierPairIndex,
            player1Id: m.player1Id,
            player2Id: m.player2Id,
            seed1: m.seed1,
            seed2: m.seed2,
            status: m.status,
            winnerId: m.winnerId,
            score: m.matchResult?.score ?? null,
            completedAt: m.completedAt,
          })),
          matches: mainMatches.map((m) => ({
            id: m.id,
            phase: m.phase,
            round: m.round,
            bracketPosition: m.bracketPosition,
            slotTop: m.slotTop,
            slotBottom: m.slotBottom,
            player1Id: m.player1Id,
            player2Id: m.player2Id,
            seed1: m.seed1,
            seed2: m.seed2,
            isBye: m.isBye,
            status: m.status,
            winnerId: m.winnerId,
            score: m.matchResult?.score ?? null,
            isWalkover: m.matchResult?.isWalkover ?? false,
            tbdPlayer1Label: m.tbdPlayer1Label,
            tbdPlayer1Source: m.tbdPlayer1Source,
            tbdPlayer2Label: m.tbdPlayer2Label,
            tbdPlayer2Source: m.tbdPlayer2Source,
            nextMatchId: m.nextMatchId,
            nextMatchSlot: m.nextMatchSlot,
            scheduledFor: m.scheduledFor,
            completedAt: m.completedAt,
          })),
        };
      }),
    };
  }
}
