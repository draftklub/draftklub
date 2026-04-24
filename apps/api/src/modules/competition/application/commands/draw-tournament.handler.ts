import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  BracketGeneratorService,
  type PlayerSeed,
  type GeneratedMatch,
} from '../../domain/services/bracket-generator.service';

export interface DrawTournamentCommand {
  tournamentId: string;
}

@Injectable()
export class DrawTournamentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bracketGenerator: BracketGeneratorService,
  ) {}

  async execute(cmd: DrawTournamentCommand) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      include: {
        categories: { orderBy: { order: 'asc' } },
        entries: {
          where: { status: { in: ['pending_seeding', 'seeded'] } },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${cmd.tournamentId} not found`);
    }
    if (tournament.status === 'finished') {
      throw new BadRequestException('Cannot draw a finished tournament');
    }
    if (tournament.status === 'in_progress') {
      throw new BadRequestException('Tournament already in progress');
    }
    if (tournament.entries.length < 2) {
      throw new BadRequestException('Need at least 2 entries to draw');
    }

    const ratings = await this.prisma.playerRankingEntry.findMany({
      where: {
        rankingId: tournament.rankingId,
        userId: { in: tournament.entries.map((e) => e.userId) },
      },
    });
    const ratingByUser = new Map(ratings.map((r) => [r.userId, r.rating]));

    const results: { categoryId: string; matches: GeneratedMatch[] }[] = [];

    for (const category of tournament.categories) {
      const catEntries = tournament.entries.filter((e) => e.categoryId === category.id);
      if (catEntries.length < 2) continue;

      const sortedByRating = [...catEntries].sort((a, b) => {
        const ra = ratingByUser.get(a.userId) ?? a.ratingAtEntry ?? 1000;
        const rb = ratingByUser.get(b.userId) ?? b.ratingAtEntry ?? 1000;
        return rb - ra;
      });

      const players: PlayerSeed[] = sortedByRating.map((e, i) => ({
        userId: e.userId,
        seed: i + 1,
        rating: ratingByUser.get(e.userId) ?? e.ratingAtEntry ?? 1000,
      }));

      const matches = this.bracketGenerator.generate(players);
      results.push({ categoryId: category.id, matches });
    }

    if (results.length === 0) {
      throw new BadRequestException('No category has enough entries to draw');
    }

    return this.prisma.$transaction(async (tx) => {
      const createdByPosition = new Map<string, string>();

      for (const { categoryId, matches } of results) {
        for (const m of matches) {
          const created = await tx.tournamentMatch.create({
            data: {
              tournamentId: cmd.tournamentId,
              categoryId,
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
              status: m.isBye ? 'bye' : 'pending',
              winnerId: m.isBye ? (m.player1Id ?? m.player2Id) : null,
              completedAt: m.isBye ? new Date() : null,
            },
          });
          createdByPosition.set(`${categoryId}:${m.bracketPosition}`, created.id);
        }
      }

      for (const { categoryId, matches } of results) {
        for (const m of matches) {
          if (!m.nextBracketPosition) continue;
          const thisId = createdByPosition.get(`${categoryId}:${m.bracketPosition}`);
          const nextId = createdByPosition.get(`${categoryId}:${m.nextBracketPosition}`);
          if (!thisId || !nextId) continue;
          await tx.tournamentMatch.update({
            where: { id: thisId },
            data: { nextMatchId: nextId, nextMatchSlot: m.nextMatchSlot },
          });

          if (m.isBye) {
            const winnerId = m.player1Id ?? m.player2Id;
            if (winnerId) {
              const slotField = m.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
              await tx.tournamentMatch.update({
                where: { id: nextId },
                data: { [slotField]: winnerId },
              });
            }
          }
        }
      }

      await tx.tournamentEntry.updateMany({
        where: {
          tournamentId: cmd.tournamentId,
          status: { in: ['pending_seeding', 'seeded'] },
        },
        data: { status: 'seeded', seededAt: new Date() },
      });

      const firstPhase = results[0]?.matches[0]?.phase ?? null;
      await tx.tournament.update({
        where: { id: cmd.tournamentId },
        data: {
          status: 'in_progress',
          currentPhase: firstPhase,
        },
      });

      return tx.tournamentMatch.findMany({
        where: { tournamentId: cmd.tournamentId },
        orderBy: [{ categoryId: 'asc' }, { round: 'asc' }, { bracketPosition: 'asc' }],
      });
    });
  }
}
