import type { Visibility } from '../../domain/services/booking-visibility.service';

export interface TournamentInfo {
  tournamentName: string;
  phase: string;
  matchKind: string;
}

export interface BookingShape {
  id: string;
  klubId: string;
  spaceId: string;
  startsAt: Date;
  endsAt: Date | null;
  bookingType: string;
  creationMode: string;
  status: string;
  matchType: string | null;
  primaryPlayerId: string | null;
  otherPlayers: unknown;
  responsibleMemberId: string | null;
  tournamentMatchId: string | null;
  bookingSeriesId: string | null;
  extensions: unknown;
  notes: string | null;
}

export interface BookingResponseFull {
  id: string;
  klubId: string;
  spaceId: string;
  startsAt: Date;
  endsAt: Date | null;
  bookingType: string;
  creationMode: string;
  status: string;
  matchType: string | null;
  primaryPlayerId: string | null;
  otherPlayers: unknown;
  responsibleMemberId: string | null;
  tournamentMatchId: string | null;
  tournamentInfo?: TournamentInfo;
  bookingSeriesId: string | null;
  extensions: unknown;
  notes: string | null;
}

export interface BookingResponseLimited {
  id: string;
  spaceId: string;
  startsAt: Date;
  endsAt: Date | null;
  bookingType: string;
  matchType: string | null;
  status: string;
  tournamentMatchId: string | null;
  tournamentInfo?: TournamentInfo;
}

const OPERATIONAL_BLOCK_TYPES = new Set([
  'maintenance',
  'weather_closed',
  'staff_blocked',
]);

export function presentBooking(
  booking: BookingShape,
  visibility: Visibility,
  tournamentInfo?: TournamentInfo,
): BookingResponseFull | BookingResponseLimited {
  const isOperationalBlock = OPERATIONAL_BLOCK_TYPES.has(booking.bookingType);

  if (visibility === 'limited' && !isOperationalBlock) {
    return {
      id: booking.id,
      spaceId: booking.spaceId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      bookingType: booking.bookingType,
      matchType: booking.matchType,
      status: booking.status,
      tournamentMatchId: booking.tournamentMatchId,
      tournamentInfo,
    };
  }

  return {
    id: booking.id,
    klubId: booking.klubId,
    spaceId: booking.spaceId,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    bookingType: booking.bookingType,
    creationMode: booking.creationMode,
    status: booking.status,
    matchType: booking.matchType,
    primaryPlayerId: booking.primaryPlayerId,
    otherPlayers: booking.otherPlayers,
    responsibleMemberId: booking.responsibleMemberId,
    tournamentMatchId: booking.tournamentMatchId,
    tournamentInfo,
    bookingSeriesId: booking.bookingSeriesId,
    extensions: booking.extensions,
    notes: booking.notes,
  };
}
