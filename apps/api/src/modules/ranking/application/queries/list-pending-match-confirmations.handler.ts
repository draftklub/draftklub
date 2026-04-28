import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface PendingMatchConfirmationItem {
  matchId: string;
  rankingId: string;
  rankingName: string;
  source: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  winnerId: string | null;
  score: string | null;
  playedAt: string;
  submittedById: string;
  submittedByName: string;
  /** Tournament context se vier de torneio (source != 'casual'). */
  tournamentId: string | null;
  tournamentName: string | null;
}

/**
 * Sprint K PR-K5a — lista MatchResult com status pending_confirmation
 * onde o caller é um dos players E não foi quem submitou (precisa
 * confirmar). Cobre tanto matches casuais quanto de torneio em modo
 * player_with_confirm.
 *
 * Sem essa lista, frontend não tinha como descobrir matchId pra chamar
 * POST /matches/:id/confirm — endpoint existia mas era cego.
 */
@Injectable()
export class ListPendingMatchConfirmationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<PendingMatchConfirmationItem[]> {
    const rows = await this.prisma.matchResult.findMany({
      where: {
        status: 'pending_confirmation',
        OR: [{ player1Id: userId }, { player2Id: userId }],
        // Caller não pode confirmar próprio submit.
        NOT: { submittedById: userId },
      },
      include: {
        ranking: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (rows.length === 0) return [];

    // Bulk lookup users (player1, player2, submittedBy).
    const userIds = new Set<string>();
    for (const r of rows) {
      userIds.add(r.player1Id);
      userIds.add(r.player2Id);
      userIds.add(r.submittedById);
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    return rows.map((r) => ({
      matchId: r.id,
      rankingId: r.rankingId,
      rankingName: r.ranking.name,
      source: r.source,
      player1Id: r.player1Id,
      player2Id: r.player2Id,
      player1Name: nameById.get(r.player1Id) ?? '—',
      player2Name: nameById.get(r.player2Id) ?? '—',
      winnerId: r.winnerId,
      score: r.score,
      playedAt: r.playedAt.toISOString(),
      submittedById: r.submittedById,
      submittedByName: nameById.get(r.submittedById) ?? '—',
      tournamentId: r.tournamentId,
      tournamentName: r.tournament?.name ?? null,
    }));
  }
}
