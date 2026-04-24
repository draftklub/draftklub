import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  BracketGeneratorService,
  type PlayerSeed,
  type GeneratedMatch,
} from '../../domain/services/bracket-generator.service';
import {
  PrequalifierGeneratorService,
  type CategoryWithPlayers,
  type PrequalifierPairing,
} from '../../domain/services/prequalifier-generator.service';

export interface DrawTournamentCommand {
  tournamentId: string;
}

interface TbdSlotInfo {
  source: 'prequalifier_winner' | 'prequalifier_loser';
  prequalifierTempId: string;
  label: string;
}

interface MainMatchRecord {
  categoryId: string;
  phase: string;
  round: number;
  bracketPosition: string;
  slotTop: number;
  slotBottom: number;
  player1Id: string | null;
  player2Id: string | null;
  seed1: number | null;
  seed2: number | null;
  isBye: boolean;
  nextBracketPosition: string | null;
  nextMatchSlot: 'top' | 'bottom' | null;
  tbdPlayer1Source: string | null;
  tbdPlayer1PrequalifierTempId: string | null;
  tbdPlayer1Label: string | null;
  tbdPlayer2Source: string | null;
  tbdPlayer2PrequalifierTempId: string | null;
  tbdPlayer2Label: string | null;
}

interface PrequalifierMatchRecord {
  tempId: string;
  categoryId: string;
  bracketPosition: string;
  player1Id: string;
  player2Id: string;
  seed1: number;
  seed2: number;
  prequalifierFrontierUpper: string;
  prequalifierFrontierLower: string;
  prequalifierPairIndex: number;
}

@Injectable()
export class DrawTournamentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bracketGenerator: BracketGeneratorService,
    private readonly prequalifierGenerator: PrequalifierGeneratorService,
  ) {}

  async execute(cmd: DrawTournamentCommand) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      include: {
        categories: { orderBy: { order: 'asc' } },
        entries: { where: { status: { in: ['pending_seeding', 'seeded'] } } },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${cmd.tournamentId} not found`);
    }
    if (tournament.status === 'finished') {
      throw new BadRequestException('Cannot draw a finished tournament');
    }
    if (tournament.status === 'in_progress' || tournament.status === 'prequalifying') {
      throw new BadRequestException('Tournament already drawn');
    }
    if (tournament.format !== 'knockout') {
      throw new BadRequestException(`Only 'knockout' supported. Other formats in day 9D`);
    }
    if (tournament.entries.length < 2) {
      throw new BadRequestException('Need at least 2 entries to draw');
    }

    const existingMatches = await this.prisma.tournamentMatch.count({
      where: { tournamentId: cmd.tournamentId },
    });
    if (existingMatches > 0) {
      throw new BadRequestException('Tournament already drawn');
    }

    const rankingEntries = await this.prisma.playerRankingEntry.findMany({
      where: {
        rankingId: tournament.rankingId,
        userId: { in: tournament.entries.map((e) => e.userId) },
      },
    });
    const ratingByUser = new Map(rankingEntries.map((r) => [r.userId, r.rating]));

    const categoriesWithPlayers: CategoryWithPlayers[] = tournament.categories.map((cat) => {
      const catEntries = tournament.entries.filter((e) => e.categoryId === cat.id);
      const sortedByRating = [...catEntries].sort((a, b) => {
        const ra = ratingByUser.get(a.userId) ?? a.ratingAtEntry ?? 1000;
        const rb = ratingByUser.get(b.userId) ?? b.ratingAtEntry ?? 1000;
        return rb - ra;
      });
      return {
        id: cat.id,
        name: cat.name,
        order: cat.order,
        players: sortedByRating.map((e, i) => ({
          userId: e.userId,
          rating: ratingByUser.get(e.userId) ?? e.ratingAtEntry ?? 1000,
          seed: i + 1,
        })),
      };
    });

    const prequalifierPairings: (PrequalifierPairing & { tempId: string })[] = [];

    if (tournament.hasPrequalifiers) {
      if (!tournament.prequalifierBordersPerFrontier) {
        throw new BadRequestException(
          'hasPrequalifiers=true but prequalifierBordersPerFrontier is null',
        );
      }
      const pairings = this.prequalifierGenerator.generate(
        categoriesWithPlayers,
        tournament.prequalifierBordersPerFrontier,
      );
      pairings.forEach((p, idx) => {
        prequalifierPairings.push({ ...p, tempId: `PREQ-${idx + 1}` });
      });
    }

    const mainMatchRecords: MainMatchRecord[] = [];

    for (const category of categoriesWithPlayers) {
      const directPlayers: PlayerSeed[] = [];
      const tbdSlots: TbdSlotInfo[] = [];

      if (tournament.hasPrequalifiers) {
        const pairingsThisIsLower = prequalifierPairings.filter(
          (p) => p.lowerCategoryId === category.id,
        );
        const pairingsThisIsUpper = prequalifierPairings.filter(
          (p) => p.upperCategoryId === category.id,
        );

        const excludeIds = new Set<string>([
          ...pairingsThisIsLower.map((p) => p.lowerPlayerId),
          ...pairingsThisIsUpper.map((p) => p.upperPlayerId),
        ]);

        category.players.forEach((p) => {
          if (!excludeIds.has(p.userId)) directPlayers.push({ ...p });
        });
        directPlayers.forEach((p, idx) => {
          p.seed = idx + 1;
        });

        pairingsThisIsUpper.forEach((p) => {
          tbdSlots.push({
            source: 'prequalifier_winner',
            prequalifierTempId: p.tempId,
            label: `Vencedor Pré ${p.frontierUpper}/${p.frontierLower} #${p.pairIndex}`,
          });
        });
        pairingsThisIsLower.forEach((p) => {
          tbdSlots.push({
            source: 'prequalifier_loser',
            prequalifierTempId: p.tempId,
            label: `Perdedor Pré ${p.frontierUpper}/${p.frontierLower} #${p.pairIndex}`,
          });
        });
      } else {
        directPlayers.push(...category.players);
      }

      const totalInBracket = directPlayers.length + tbdSlots.length;
      if (totalInBracket < 2) continue;

      const tbdPrefix = `TBD-${category.id}-`;
      const pseudoPlayers: PlayerSeed[] = directPlayers.map((p) => ({ ...p }));
      tbdSlots.forEach((_slot, idx) => {
        pseudoPlayers.push({
          userId: `${tbdPrefix}${idx}`,
          rating: 0,
          seed: pseudoPlayers.length + 1,
        });
      });

      const generatedMatches: GeneratedMatch[] = this.bracketGenerator.generate(pseudoPlayers);

      generatedMatches.forEach((m) => {
        let p1Id: string | null = m.player1Id;
        let p2Id: string | null = m.player2Id;
        let tbd1: TbdSlotInfo | null = null;
        let tbd2: TbdSlotInfo | null = null;

        if (m.player1Id?.startsWith(tbdPrefix)) {
          const idxStr = m.player1Id.slice(tbdPrefix.length);
          const idx = parseInt(idxStr, 10);
          tbd1 = tbdSlots[idx] ?? null;
          p1Id = null;
        }
        if (m.player2Id?.startsWith(tbdPrefix)) {
          const idxStr = m.player2Id.slice(tbdPrefix.length);
          const idx = parseInt(idxStr, 10);
          tbd2 = tbdSlots[idx] ?? null;
          p2Id = null;
        }

        mainMatchRecords.push({
          categoryId: category.id,
          phase: m.phase,
          round: m.round,
          bracketPosition: m.bracketPosition,
          slotTop: m.slotTop,
          slotBottom: m.slotBottom,
          player1Id: p1Id,
          player2Id: p2Id,
          seed1: p1Id ? m.seed1 : null,
          seed2: p2Id ? m.seed2 : null,
          isBye: m.isBye,
          nextBracketPosition: m.nextBracketPosition,
          nextMatchSlot: m.nextMatchSlot,
          tbdPlayer1Source: tbd1?.source ?? null,
          tbdPlayer1PrequalifierTempId: tbd1?.prequalifierTempId ?? null,
          tbdPlayer1Label: tbd1?.label ?? null,
          tbdPlayer2Source: tbd2?.source ?? null,
          tbdPlayer2PrequalifierTempId: tbd2?.prequalifierTempId ?? null,
          tbdPlayer2Label: tbd2?.label ?? null,
        });
      });
    }

    if (mainMatchRecords.length === 0 && prequalifierPairings.length === 0) {
      throw new BadRequestException('No category has enough entries to draw');
    }

    const prequalifierRecords: PrequalifierMatchRecord[] = prequalifierPairings.map((p) => ({
      tempId: p.tempId,
      categoryId: p.upperCategoryId,
      bracketPosition: `PRE-${p.frontierUpper}-${p.frontierLower}-${p.pairIndex}`,
      player1Id: p.upperPlayerId,
      player2Id: p.lowerPlayerId,
      seed1: p.upperSeed,
      seed2: p.lowerSeed,
      prequalifierFrontierUpper: p.frontierUpper,
      prequalifierFrontierLower: p.frontierLower,
      prequalifierPairIndex: p.pairIndex,
    }));

    return this.prisma.$transaction(async (tx) => {
      const tempIdToRealId = new Map<string, string>();

      for (const rec of prequalifierRecords) {
        const created = await tx.tournamentMatch.create({
          data: {
            tournamentId: cmd.tournamentId,
            categoryId: rec.categoryId,
            matchKind: 'prequalifier',
            phase: 'prequalifier',
            round: 0,
            bracketPosition: rec.bracketPosition,
            slotTop: 1,
            slotBottom: 2,
            player1Id: rec.player1Id,
            player2Id: rec.player2Id,
            seed1: rec.seed1,
            seed2: rec.seed2,
            isBye: false,
            status: 'scheduled',
            prequalifierFrontierUpper: rec.prequalifierFrontierUpper,
            prequalifierFrontierLower: rec.prequalifierFrontierLower,
            prequalifierPairIndex: rec.prequalifierPairIndex,
          },
        });
        tempIdToRealId.set(rec.tempId, created.id);
      }

      const mainCreatedByKey = new Map<string, string>();

      for (const rec of mainMatchRecords) {
        const hasBothPlayers = rec.player1Id != null && rec.player2Id != null;
        const initialStatus = rec.isBye
          ? 'bye'
          : hasBothPlayers && rec.round === 1
            ? 'scheduled'
            : 'pending';

        const created = await tx.tournamentMatch.create({
          data: {
            tournamentId: cmd.tournamentId,
            categoryId: rec.categoryId,
            matchKind: 'main',
            phase: rec.phase,
            round: rec.round,
            bracketPosition: rec.bracketPosition,
            slotTop: rec.slotTop,
            slotBottom: rec.slotBottom,
            player1Id: rec.player1Id,
            player2Id: rec.player2Id,
            seed1: rec.seed1,
            seed2: rec.seed2,
            isBye: rec.isBye,
            status: initialStatus,
            winnerId: rec.isBye ? (rec.player1Id ?? rec.player2Id) : null,
            completedAt: rec.isBye ? new Date() : null,
            tbdPlayer1Source: rec.tbdPlayer1Source,
            tbdPlayer1PrequalifierMatchRef: rec.tbdPlayer1PrequalifierTempId
              ? (tempIdToRealId.get(rec.tbdPlayer1PrequalifierTempId) ?? null)
              : null,
            tbdPlayer1Label: rec.tbdPlayer1Label,
            tbdPlayer2Source: rec.tbdPlayer2Source,
            tbdPlayer2PrequalifierMatchRef: rec.tbdPlayer2PrequalifierTempId
              ? (tempIdToRealId.get(rec.tbdPlayer2PrequalifierTempId) ?? null)
              : null,
            tbdPlayer2Label: rec.tbdPlayer2Label,
          },
        });
        mainCreatedByKey.set(`${rec.categoryId}::${rec.bracketPosition}`, created.id);
      }

      for (const rec of mainMatchRecords) {
        if (!rec.nextBracketPosition) continue;
        const currId = mainCreatedByKey.get(`${rec.categoryId}::${rec.bracketPosition}`);
        const nextId = mainCreatedByKey.get(`${rec.categoryId}::${rec.nextBracketPosition}`);
        if (!currId || !nextId) continue;
        await tx.tournamentMatch.update({
          where: { id: currId },
          data: { nextMatchId: nextId, nextMatchSlot: rec.nextMatchSlot },
        });

        if (rec.isBye) {
          const winnerId = rec.player1Id ?? rec.player2Id;
          if (winnerId) {
            const slotField = rec.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
            await tx.tournamentMatch.update({
              where: { id: nextId },
              data: { [slotField]: winnerId },
            });
          }
        }
      }

      await tx.tournamentEntry.updateMany({
        where: {
          tournamentId: cmd.tournamentId,
          status: { in: ['pending_seeding', 'seeded'] },
        },
        data: { status: 'playing', seededAt: new Date() },
      });

      const newStatus = tournament.hasPrequalifiers ? 'prequalifying' : 'in_progress';
      const firstPhase = tournament.hasPrequalifiers
        ? 'prequalifier'
        : (mainMatchRecords.find((r) => r.round === 1)?.phase ?? null);

      await tx.tournament.update({
        where: { id: cmd.tournamentId },
        data: { status: newStatus, currentPhase: firstPhase },
      });

      return tx.tournamentMatch.findMany({
        where: { tournamentId: cmd.tournamentId },
        orderBy: [
          { matchKind: 'desc' },
          { categoryId: 'asc' },
          { round: 'asc' },
          { bracketPosition: 'asc' },
        ],
      });
    });
  }
}
