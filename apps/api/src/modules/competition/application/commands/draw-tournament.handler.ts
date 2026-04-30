import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { MetricsService } from '../../../../shared/metrics/metrics.service';
import {
  PrequalifierGeneratorService,
  type PrequalifierPairing,
} from '../../domain/services/prequalifier-generator.service';
import type {
  CategoryWithPlayers,
  DrawContext,
  PlayerSeed,
  TournamentFormatStrategy,
} from '../../domain/services/strategies/tournament-format.strategy';
import { KnockoutStrategy } from '../../domain/services/strategies/knockout.strategy';
import { RoundRobinStrategy } from '../../domain/services/strategies/round-robin.strategy';
import { GroupsKnockoutStrategy } from '../../domain/services/strategies/groups-knockout.strategy';
import { DoubleEliminationStrategy } from '../../domain/services/strategies/double-elimination.strategy';

export interface DrawTournamentCommand {
  tournamentId: string;
}

interface TbdSlotInfo {
  source: 'prequalifier_winner' | 'prequalifier_loser';
  prequalifierTempId: string;
  label: string;
}

interface PrequalifierRecord {
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

function isTbdUserId(userId: string | null, prefix: string): boolean {
  return userId?.startsWith(prefix) ?? false;
}

@Injectable()
export class DrawTournamentHandler {
  private readonly strategies = new Map<string, TournamentFormatStrategy>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly prequalifierGenerator: PrequalifierGeneratorService,
    knockoutStrategy: KnockoutStrategy,
    roundRobinStrategy: RoundRobinStrategy,
    groupsKnockoutStrategy: GroupsKnockoutStrategy,
    doubleEliminationStrategy: DoubleEliminationStrategy,
    private readonly metrics: MetricsService,
  ) {
    this.strategies.set(knockoutStrategy.format, knockoutStrategy);
    this.strategies.set(roundRobinStrategy.format, roundRobinStrategy);
    this.strategies.set(groupsKnockoutStrategy.format, groupsKnockoutStrategy);
    this.strategies.set(doubleEliminationStrategy.format, doubleEliminationStrategy);
  }

  async execute(cmd: DrawTournamentCommand) {
    return this.metrics.timeTournamentDraw(() => this.executeInner(cmd));
  }

  private async executeInner(cmd: DrawTournamentCommand) {
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
    if (tournament.entries.length < 2) {
      throw new BadRequestException('Need at least 2 entries to draw');
    }

    const strategy = this.strategies.get(tournament.format);
    if (!strategy) {
      throw new BadRequestException(`Unsupported tournament format: ${tournament.format}`);
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

    const categoriesWithRealPlayers: CategoryWithPlayers[] = tournament.categories.map((cat) => {
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
        categoriesWithRealPlayers,
        tournament.prequalifierBordersPerFrontier,
      );
      pairings.forEach((p, idx) => {
        prequalifierPairings.push({ ...p, tempId: `PREQ-${idx + 1}` });
      });
    }

    const categoriesForStrategy: CategoryWithPlayers[] = [];
    const tbdSlotsByCategory = new Map<string, TbdSlotInfo[]>();
    const tbdPrefix = 'TBD-';

    for (const category of categoriesWithRealPlayers) {
      const directPlayers: PlayerSeed[] = [];
      const tbdSlots: TbdSlotInfo[] = [];

      if (tournament.hasPrequalifiers) {
        const pairingsLower = prequalifierPairings.filter((p) => p.lowerCategoryId === category.id);
        const pairingsUpper = prequalifierPairings.filter((p) => p.upperCategoryId === category.id);
        const excludeIds = new Set<string>([
          ...pairingsLower.map((p) => p.lowerPlayerId),
          ...pairingsUpper.map((p) => p.upperPlayerId),
        ]);

        category.players.forEach((p) => {
          if (!excludeIds.has(p.userId)) directPlayers.push({ ...p });
        });
        directPlayers.forEach((p, idx) => {
          p.seed = idx + 1;
        });

        pairingsUpper.forEach((p) => {
          tbdSlots.push({
            source: 'prequalifier_winner',
            prequalifierTempId: p.tempId,
            label: `Vencedor Pré ${p.frontierUpper}/${p.frontierLower} #${p.pairIndex}`,
          });
        });
        pairingsLower.forEach((p) => {
          tbdSlots.push({
            source: 'prequalifier_loser',
            prequalifierTempId: p.tempId,
            label: `Perdedor Pré ${p.frontierUpper}/${p.frontierLower} #${p.pairIndex}`,
          });
        });
      } else {
        directPlayers.push(...category.players);
      }

      const players: PlayerSeed[] = directPlayers.map((p) => ({ ...p }));
      tbdSlots.forEach((_slot, idx) => {
        players.push({
          userId: `${tbdPrefix}${category.id}-${idx}`,
          rating: 0,
          seed: players.length + 1,
        });
      });

      tbdSlotsByCategory.set(category.id, tbdSlots);
      categoriesForStrategy.push({
        id: category.id,
        name: category.name,
        order: category.order,
        players,
      });
    }

    const drawContext: DrawContext = {
      tournamentId: cmd.tournamentId,
      format: tournament.format,
      hasPrequalifiers: tournament.hasPrequalifiers,
      groupsConfig: tournament.groupsConfig as DrawContext['groupsConfig'],
      categories: categoriesForStrategy,
    };

    const validation = strategy.validate(drawContext);
    if (!validation.ok) {
      throw new BadRequestException(validation.errors?.join('; ') ?? 'Invalid draw context');
    }

    const strategyMatches = strategy.generateMatches(drawContext);

    if (strategyMatches.length === 0 && prequalifierPairings.length === 0) {
      throw new BadRequestException('No category has enough entries to draw');
    }

    const prequalifierRecords: PrequalifierRecord[] = prequalifierPairings.map((p) => ({
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

      for (const m of strategyMatches) {
        const tbdSlots = tbdSlotsByCategory.get(m.categoryId) ?? [];

        let p1: string | null = m.player1Id;
        let p2: string | null = m.player2Id;
        let tbd1Source: string | null = null;
        let tbd1Label: string | null = null;
        let tbd1Ref: string | null = null;
        let tbd2Source: string | null = null;
        let tbd2Label: string | null = null;
        let tbd2Ref: string | null = null;

        if (m.player1Id && isTbdUserId(m.player1Id, tbdPrefix)) {
          const idxStr = m.player1Id.slice(tbdPrefix.length).split('-').pop() ?? '0';
          const tbd = tbdSlots[parseInt(idxStr, 10)] ?? null;
          if (tbd) {
            tbd1Source = tbd.source;
            tbd1Label = tbd.label;
            tbd1Ref = tempIdToRealId.get(tbd.prequalifierTempId) ?? null;
          }
          p1 = null;
        } else if (p1 == null && m.tbdPlayer1) {
          tbd1Source = m.tbdPlayer1.source;
          tbd1Label = m.tbdPlayer1.label;
        }

        if (m.player2Id && isTbdUserId(m.player2Id, tbdPrefix)) {
          const idxStr = m.player2Id.slice(tbdPrefix.length).split('-').pop() ?? '0';
          const tbd = tbdSlots[parseInt(idxStr, 10)] ?? null;
          if (tbd) {
            tbd2Source = tbd.source;
            tbd2Label = tbd.label;
            tbd2Ref = tempIdToRealId.get(tbd.prequalifierTempId) ?? null;
          }
          p2 = null;
        } else if (p2 == null && m.tbdPlayer2) {
          tbd2Source = m.tbdPlayer2.source;
          tbd2Label = m.tbdPlayer2.label;
        }

        const hasBothPlayers = p1 != null && p2 != null;
        const initialStatus = m.isBye
          ? 'bye'
          : hasBothPlayers && m.round === 1
            ? 'scheduled'
            : 'pending';

        const created = await tx.tournamentMatch.create({
          data: {
            tournamentId: cmd.tournamentId,
            categoryId: m.categoryId,
            matchKind: m.matchKind,
            phase: m.phase,
            round: m.round,
            bracketPosition: m.bracketPosition,
            slotTop: m.slotTop,
            slotBottom: m.slotBottom,
            player1Id: p1,
            player2Id: p2,
            seed1: p1 != null ? m.seed1 : null,
            seed2: p2 != null ? m.seed2 : null,
            isBye: m.isBye,
            status: initialStatus,
            winnerId: m.isBye ? (p1 ?? p2) : null,
            completedAt: m.isBye ? new Date() : null,
            tbdPlayer1Source: tbd1Source,
            tbdPlayer1PrequalifierMatchRef: tbd1Ref,
            tbdPlayer1Label: tbd1Label,
            tbdPlayer2Source: tbd2Source,
            tbdPlayer2PrequalifierMatchRef: tbd2Ref,
            tbdPlayer2Label: tbd2Label,
          },
        });
        mainCreatedByKey.set(`${m.categoryId}::${m.bracketPosition}`, created.id);
      }

      for (const m of strategyMatches) {
        if (!m.nextBracketPosition) continue;
        const currId = mainCreatedByKey.get(`${m.categoryId}::${m.bracketPosition}`);
        const nextId = mainCreatedByKey.get(`${m.categoryId}::${m.nextBracketPosition}`);
        if (!currId || !nextId) continue;
        await tx.tournamentMatch.update({
          where: { id: currId },
          data: { nextMatchId: nextId, nextMatchSlot: m.nextMatchSlot },
        });

        if (m.isBye) {
          const winnerId =
            m.player1Id && !isTbdUserId(m.player1Id, tbdPrefix)
              ? m.player1Id
              : m.player2Id && !isTbdUserId(m.player2Id, tbdPrefix)
                ? m.player2Id
                : null;
          if (winnerId) {
            const slotField = m.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
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

      const newStatus = strategy.getInitialStatus(tournament.hasPrequalifiers);
      const newPhase = strategy.getInitialPhase(strategyMatches, tournament.hasPrequalifiers);

      await tx.tournament.update({
        where: { id: cmd.tournamentId },
        data: { status: newStatus as $Enums.TournamentStatus, currentPhase: newPhase },
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
