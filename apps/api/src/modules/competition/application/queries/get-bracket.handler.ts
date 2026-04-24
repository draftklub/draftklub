import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetBracketHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        categories: { orderBy: { order: 'asc' } },
        matches: {
          orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
          include: {
            matchResult: {
              select: {
                id: true,
                winnerId: true,
                score: true,
                status: true,
                isWalkover: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      currentPhase: tournament.currentPhase,
      resultReportingMode: tournament.resultReportingMode,
      categories: tournament.categories.map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        matches: tournament.matches
          .filter((m) => m.categoryId === c.id)
          .map((m) => ({
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
            nextMatchId: m.nextMatchId,
            nextMatchSlot: m.nextMatchSlot,
            scheduledFor: m.scheduledFor,
            completedAt: m.completedAt,
            result: m.matchResult,
          })),
      })),
    };
  }
}
