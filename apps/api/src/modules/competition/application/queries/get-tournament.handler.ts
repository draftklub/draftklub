import { Injectable, NotFoundException } from '@nestjs/common';
import type { TournamentDetail } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetTournamentHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sprint N batch N-17 — return type pinned em `TournamentDetail`.
   * Antes retornava shape divergente do contrato (faltavam klubSportId,
   * coverUrl, resultReportingMode, pointsApplied, cancelledAt,
   * createdAt + entryCount/matchCount como aggregates top-level). FE
   * castava `as TournamentDetail` e quebrava em runtime nos campos
   * faltantes (entryCount, resultReportingMode usados no detail page).
   */
  async execute(id: string): Promise<TournamentDetail> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { entries: true, matches: true },
        },
      },
    });

    if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);

    return {
      id: tournament.id,
      klubSportId: tournament.klubSportId,
      rankingId: tournament.rankingId,
      name: tournament.name,
      description: tournament.description,
      coverUrl: tournament.coverUrl,
      format: tournament.format,
      hasPrequalifiers: tournament.hasPrequalifiers,
      prequalifierBordersPerFrontier: tournament.prequalifierBordersPerFrontier,
      registrationApproval: tournament.registrationApproval,
      registrationFee:
        tournament.registrationFee !== null ? tournament.registrationFee.toString() : null,
      registrationOpensAt: tournament.registrationOpensAt.toISOString(),
      registrationClosesAt: tournament.registrationClosesAt.toISOString(),
      drawDate: tournament.drawDate.toISOString(),
      prequalifierStartDate: tournament.prequalifierStartDate?.toISOString() ?? null,
      prequalifierEndDate: tournament.prequalifierEndDate?.toISOString() ?? null,
      mainStartDate: tournament.mainStartDate.toISOString(),
      mainEndDate: tournament.mainEndDate?.toISOString() ?? null,
      status: tournament.status,
      currentPhase: tournament.currentPhase,
      resultReportingMode: tournament.resultReportingMode,
      pointsApplied: tournament.pointsApplied,
      pointsAppliedAt: tournament.pointsAppliedAt?.toISOString() ?? null,
      cancelledAt: tournament.cancelledAt?.toISOString() ?? null,
      cancellationReason: tournament.cancellationReason,
      categories: tournament.categories.map((c) => ({
        id: c.id,
        tournamentId: c.tournamentId,
        name: c.name,
        order: c.order,
        maxPlayers: c.maxPlayers,
        minRatingExpected: c.minRatingExpected,
        maxRatingExpected: c.maxRatingExpected,
        pointsSchemaId: c.pointsSchemaId,
      })),
      entryCount: tournament._count.entries,
      matchCount: tournament._count.matches,
      createdAt: tournament.createdAt.toISOString(),
    };
  }
}
