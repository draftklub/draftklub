import { Injectable } from '@nestjs/common';
import { ApplyTournamentPointsService } from './apply-tournament-points.service';

export interface ProgressionContext {
  id: string;
  tournamentId: string;
  phase: string;
  player1Id: string | null;
  player2Id: string | null;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
  matchKind?: string;
  categoryId?: string;
  bracketPosition?: string;
}

interface TxLike {
  tournamentMatch: {
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
  tournamentEntry: {
    updateMany: (args: unknown) => Promise<unknown>;
  };
  tournament: {
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  playerRankingEntry: {
    upsert: (args: unknown) => Promise<unknown>;
  };
}

interface PrequalifierMatch {
  id: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string;
}

interface DependentMatchRow {
  id: string;
  status: string;
  player1Id: string | null;
  player2Id: string | null;
  tbdPlayer1PrequalifierMatchRef: string | null;
  tbdPlayer1Source: string | null;
  tbdPlayer2PrequalifierMatchRef: string | null;
  tbdPlayer2Source: string | null;
}

export function parseGroupIdFromBracketPosition(bracketPosition: string): string | null {
  if (!bracketPosition.startsWith('GRP-')) return null;
  const parts = bracketPosition.split('-');
  return parts[1] ?? null;
}

function eliminationStatus(phase: string): string {
  switch (phase) {
    case 'final':
      return 'runner_up';
    case 'semifinals':
      return 'semi_finalist';
    case 'quarterfinals':
      return 'quarter_finalist';
    default:
      return 'eliminated';
  }
}

function eliminationPosition(phase: string): string {
  switch (phase) {
    case 'final':
      return 'runner_up';
    case 'semifinals':
      return 'semi';
    case 'quarterfinals':
      return 'quarter';
    case 'round_of_16':
      return 'round_of_16';
    case 'round_of_32':
      return 'round_of_32';
    default:
      return phase;
  }
}

@Injectable()
export class TournamentProgressionService {
  constructor(private readonly pointsService: ApplyTournamentPointsService) {}

  async advance(
    tx: TxLike,
    match: ProgressionContext,
    winnerId: string,
  ): Promise<void> {
    if (match.phase === 'prequalifier' || match.matchKind === 'prequalifier') {
      await this.resolvePrequalifierSlots(tx, {
        id: match.id,
        tournamentId: match.tournamentId,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        winnerId,
      });
      return;
    }

    if (match.matchKind === 'group' && match.categoryId && match.bracketPosition) {
      const groupId = parseGroupIdFromBracketPosition(match.bracketPosition);
      if (groupId) {
        await this.maybeResolveGroupStandings(
          tx,
          match.tournamentId,
          match.categoryId,
          groupId,
        );
      }
      return;
    }

    const loserId =
      match.player1Id === winnerId ? match.player2Id : match.player1Id;

    if (loserId) {
      await tx.tournamentEntry.updateMany({
        where: { tournamentId: match.tournamentId, userId: loserId },
        data: {
          status: eliminationStatus(match.phase),
          finalPosition: eliminationPosition(match.phase),
        },
      });
    }

    if (!match.nextMatchId) {
      await tx.tournamentEntry.updateMany({
        where: { tournamentId: match.tournamentId, userId: winnerId },
        data: { status: 'champion', finalPosition: 'champion' },
      });
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: 'finished', currentPhase: 'final' },
      });
      await this.pointsService.apply(tx, match.tournamentId);
      return;
    }

    const slotField = match.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
    await tx.tournamentMatch.update({
      where: { id: match.nextMatchId },
      data: { [slotField]: winnerId },
    });
    await this.markScheduledIfReady(tx, match.nextMatchId);

    await tx.tournament.update({
      where: { id: match.tournamentId },
      data: { currentPhase: match.phase },
    });
  }

  async propagateBye(
    tx: TxLike,
    match: ProgressionContext,
    winnerId: string,
  ): Promise<void> {
    if (!match.nextMatchId) return;
    const slotField = match.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
    await tx.tournamentMatch.update({
      where: { id: match.nextMatchId },
      data: { [slotField]: winnerId },
    });
    await this.markScheduledIfReady(tx, match.nextMatchId);
  }

  async resolvePrequalifierSlots(
    tx: TxLike,
    prequalifierMatch: PrequalifierMatch,
  ): Promise<void> {
    const loserId =
      prequalifierMatch.winnerId === prequalifierMatch.player1Id
        ? prequalifierMatch.player2Id
        : prequalifierMatch.player1Id;

    const dependents = (await tx.tournamentMatch.findMany({
      where: {
        tournamentId: prequalifierMatch.tournamentId,
        matchKind: 'main',
        OR: [
          { tbdPlayer1PrequalifierMatchRef: prequalifierMatch.id },
          { tbdPlayer2PrequalifierMatchRef: prequalifierMatch.id },
        ],
      },
    })) as DependentMatchRow[];

    for (const dep of dependents) {
      const updates: Record<string, unknown> = {};

      if (dep.tbdPlayer1PrequalifierMatchRef === prequalifierMatch.id) {
        if (dep.tbdPlayer1Source === 'prequalifier_winner') {
          updates.player1Id = prequalifierMatch.winnerId;
        } else if (dep.tbdPlayer1Source === 'prequalifier_loser' && loserId) {
          updates.player1Id = loserId;
        }
        updates.tbdPlayer1Source = null;
        updates.tbdPlayer1PrequalifierMatchRef = null;
        updates.tbdPlayer1Label = null;
      }

      if (dep.tbdPlayer2PrequalifierMatchRef === prequalifierMatch.id) {
        if (dep.tbdPlayer2Source === 'prequalifier_winner') {
          updates.player2Id = prequalifierMatch.winnerId;
        } else if (dep.tbdPlayer2Source === 'prequalifier_loser' && loserId) {
          updates.player2Id = loserId;
        }
        updates.tbdPlayer2Source = null;
        updates.tbdPlayer2PrequalifierMatchRef = null;
        updates.tbdPlayer2Label = null;
      }

      if (Object.keys(updates).length === 0) continue;

      await tx.tournamentMatch.update({
        where: { id: dep.id },
        data: updates,
      });
      await this.markScheduledIfReady(tx, dep.id);
    }

    await this.maybeTransitionToMain(tx, prequalifierMatch.tournamentId);
  }

  async maybeResolveGroupStandings(
    tx: TxLike,
    tournamentId: string,
    categoryId: string,
    groupId: string,
  ): Promise<void> {
    const groupMatches = (await tx.tournamentMatch.findMany({
      where: {
        tournamentId,
        categoryId,
        matchKind: 'group',
        bracketPosition: { startsWith: `GRP-${groupId}-` },
      },
      select: {
        id: true,
        status: true,
        winnerId: true,
        player1Id: true,
        player2Id: true,
        seed1: true,
        seed2: true,
      },
    })) as {
      id: string;
      status: string;
      winnerId: string | null;
      player1Id: string | null;
      player2Id: string | null;
      seed1: number | null;
      seed2: number | null;
    }[];

    const allDone = groupMatches.length > 0 && groupMatches.every((m) =>
      ['completed', 'walkover'].includes(m.status),
    );
    if (!allDone) return;

    const standings = this.computeGroupStandings(groupMatches);

    for (let i = 0; i < standings.length; i++) {
      const userId = standings[i];
      if (!userId) continue;
      const positionLabel = `${i + 1}º Grupo ${groupId}`;

      await tx.tournamentMatch.updateMany({
        where: {
          tournamentId,
          categoryId,
          matchKind: 'main',
          tbdPlayer1Source: 'group_standing',
          tbdPlayer1Label: positionLabel,
        },
        data: {
          player1Id: userId,
          tbdPlayer1Source: null,
          tbdPlayer1Label: null,
        },
      });

      await tx.tournamentMatch.updateMany({
        where: {
          tournamentId,
          categoryId,
          matchKind: 'main',
          tbdPlayer2Source: 'group_standing',
          tbdPlayer2Label: positionLabel,
        },
        data: {
          player2Id: userId,
          tbdPlayer2Source: null,
          tbdPlayer2Label: null,
        },
      });
    }

    const candidates = (await tx.tournamentMatch.findMany({
      where: {
        tournamentId,
        categoryId,
        matchKind: 'main',
        status: 'pending',
      },
      select: { id: true },
    })) as { id: string }[];

    for (const c of candidates) {
      await this.markScheduledIfReady(tx, c.id);
    }
  }

  private computeGroupStandings(
    matches: {
      winnerId: string | null;
      player1Id: string | null;
      player2Id: string | null;
      seed1: number | null;
      seed2: number | null;
    }[],
  ): string[] {
    const players = new Set<string>();
    const seedByUser = new Map<string, number>();
    for (const m of matches) {
      if (m.player1Id) {
        players.add(m.player1Id);
        if (m.seed1 != null) seedByUser.set(m.player1Id, m.seed1);
      }
      if (m.player2Id) {
        players.add(m.player2Id);
        if (m.seed2 != null) seedByUser.set(m.player2Id, m.seed2);
      }
    }

    const wins = new Map<string, number>();
    for (const userId of players) wins.set(userId, 0);
    for (const m of matches) {
      if (m.winnerId) wins.set(m.winnerId, (wins.get(m.winnerId) ?? 0) + 1);
    }

    return [...players].sort((a, b) => {
      const wa = wins.get(a) ?? 0;
      const wb = wins.get(b) ?? 0;
      if (wa !== wb) return wb - wa;

      const direct = matches.find(
        (m) =>
          (m.player1Id === a && m.player2Id === b) ||
          (m.player1Id === b && m.player2Id === a),
      );
      if (direct?.winnerId === a) return -1;
      if (direct?.winnerId === b) return 1;

      const sa = seedByUser.get(a) ?? Infinity;
      const sb = seedByUser.get(b) ?? Infinity;
      return sa - sb;
    });
  }

  private async markScheduledIfReady(tx: TxLike, matchId: string): Promise<void> {
    const m = (await tx.tournamentMatch.findUnique({
      where: { id: matchId },
      select: { status: true, player1Id: true, player2Id: true },
    })) as { status: string; player1Id: string | null; player2Id: string | null } | null;

    if (!m) return;
    if (m.status !== 'pending') return;
    if (!m.player1Id || !m.player2Id) return;

    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: { status: 'scheduled' },
    });
  }

  private async maybeTransitionToMain(tx: TxLike, tournamentId: string): Promise<void> {
    const pendingPrequalifiers = await tx.tournamentMatch.count({
      where: {
        tournamentId,
        matchKind: 'prequalifier',
        status: { notIn: ['completed', 'walkover', 'double_walkover'] },
      },
    });

    if (pendingPrequalifiers > 0) return;

    const tournament = (await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { status: true },
    })) as { status: string } | null;

    if (tournament?.status !== 'prequalifying') return;

    const firstMainMatch = (await tx.tournamentMatch.findFirst({
      where: { tournamentId, matchKind: 'main' },
      orderBy: { round: 'asc' },
      select: { phase: true },
    })) as { phase: string } | null;

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'in_progress',
        currentPhase: firstMainMatch?.phase ?? 'final',
      },
    });
  }
}
