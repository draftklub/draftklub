import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetTournamentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: {
            pointsSchema: { select: { id: true, name: true } },
            _count: { select: { entries: true } },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);

    return {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      format: tournament.format,
      status: tournament.status,
      currentPhase: tournament.currentPhase,
      hasPrequalifiers: tournament.hasPrequalifiers,
      prequalifierBordersPerFrontier: tournament.prequalifierBordersPerFrontier,
      registrationApproval: tournament.registrationApproval,
      registrationFee: tournament.registrationFee,
      registrationOpensAt: tournament.registrationOpensAt,
      registrationClosesAt: tournament.registrationClosesAt,
      drawDate: tournament.drawDate,
      prequalifierStartDate: tournament.prequalifierStartDate,
      prequalifierEndDate: tournament.prequalifierEndDate,
      mainStartDate: tournament.mainStartDate,
      mainEndDate: tournament.mainEndDate,
      scheduleConfig: tournament.scheduleConfig,
      rankingId: tournament.rankingId,
      categories: tournament.categories.map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        maxPlayers: c.maxPlayers,
        minRatingExpected: c.minRatingExpected,
        maxRatingExpected: c.maxRatingExpected,
        pointsSchema: c.pointsSchema,
        entryCount: c._count.entries,
      })),
    };
  }
}
