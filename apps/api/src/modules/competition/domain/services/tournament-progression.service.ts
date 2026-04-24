import { Injectable } from '@nestjs/common';

export interface ProgressionContext {
  id: string;
  tournamentId: string;
  phase: string;
  player1Id: string | null;
  player2Id: string | null;
  nextMatchId: string | null;
  nextMatchSlot: string | null;
}

interface TxLike {
  tournamentMatch: {
    update: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
  };
  tournamentEntry: {
    updateMany: (args: unknown) => Promise<unknown>;
  };
  tournament: {
    update: (args: unknown) => Promise<unknown>;
  };
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
  async advance(
    tx: TxLike,
    match: ProgressionContext,
    winnerId: string,
  ): Promise<void> {
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
      return;
    }

    const slotField = match.nextMatchSlot === 'top' ? 'player1Id' : 'player2Id';
    await tx.tournamentMatch.update({
      where: { id: match.nextMatchId },
      data: { [slotField]: winnerId },
    });

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
  }
}
