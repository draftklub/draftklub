import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

/**
 * Sprint K PR-K5a — alinha response shape com `TournamentBracket` em
 * shared-types e preenche player names + space name (resolvendo bug do
 * K1b onde bracket sempre mostrava "A definir" porque o backend nunca
 * retornava `player1Name/player2Name`).
 *
 * Estratégia: fetch matches normalmente, depois bulk-lookup de users e
 * spaces e attach. Sem FK direta na schema (player1Id/player2Id são
 * UUIDs avulsos).
 */
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

    // Bulk lookup de player names. Player1Id/Player2Id são UUIDs sem FK
    // direta na schema, então fetch separado.
    const playerIds = new Set<string>();
    const spaceIds = new Set<string>();
    for (const cat of tournament.categories) {
      for (const m of cat.matches) {
        if (m.player1Id) playerIds.add(m.player1Id);
        if (m.player2Id) playerIds.add(m.player2Id);
        if (m.spaceId) spaceIds.add(m.spaceId);
      }
    }

    const [users, spaces] = await Promise.all([
      playerIds.size > 0
        ? this.prisma.user.findMany({
            where: { id: { in: [...playerIds] } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([] as { id: string; fullName: string }[]),
      spaceIds.size > 0
        ? this.prisma.space.findMany({
            where: { id: { in: [...spaceIds] } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as { id: string; name: string }[]),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const spaceById = new Map(spaces.map((s) => [s.id, s]));

    return {
      tournamentId: tournament.id,
      categories: tournament.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        matches: cat.matches.map((m) => ({
          id: m.id,
          tournamentId: m.tournamentId,
          categoryId: m.categoryId,
          phase: m.phase,
          round: m.round,
          bracketPosition: m.bracketPosition,
          slotTop: m.slotTop,
          slotBottom: m.slotBottom,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          player1Name: m.player1Id ? (userById.get(m.player1Id)?.fullName ?? null) : null,
          player2Name: m.player2Id ? (userById.get(m.player2Id)?.fullName ?? null) : null,
          seed1: m.seed1,
          seed2: m.seed2,
          isBye: m.isBye,
          status: m.status,
          winnerId: m.winnerId,
          matchKind: m.matchKind,
          scheduledFor: m.scheduledFor,
          completedAt: m.completedAt,
          score: m.matchResult?.score ?? null,
          tbdPlayer1Label: m.tbdPlayer1Label,
          tbdPlayer2Label: m.tbdPlayer2Label,
          spaceId: m.spaceId,
          spaceName: m.spaceId ? (spaceById.get(m.spaceId)?.name ?? null) : null,
          nextMatchId: m.nextMatchId,
          nextMatchSlot: m.nextMatchSlot as 'top' | 'bottom' | null,
        })),
      })),
    };
  }
}
