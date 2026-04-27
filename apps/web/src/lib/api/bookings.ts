import { apiFetch } from './client';

/**
 * Shape minimo de Booking que consumimos no frontend. NÃO eh o shape
 * autoritativo (BookingPresenter no backend resolve visibility); aqui
 * vai o que precisamos pro dashboard ate Onda 2.
 */
export interface BookingListItem {
  id: string;
  klubId: string;
  spaceId: string;
  primaryPlayerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  space: { id: string; name: string; type: string } | null;
}

export interface ListBookingsParams {
  spaceId?: string;
  startsAfter?: string;
  startsBefore?: string;
  status?: string;
  primaryPlayerId?: string;
}

/** GET /klubs/:klubId/bookings — lista bookings do Klub. */
export function listKlubBookings(
  klubId: string,
  params: ListBookingsParams = {},
): Promise<BookingListItem[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') qs.set(k, v);
  }
  const suffix = qs.toString();
  return apiFetch<BookingListItem[]>(`/klubs/${klubId}/bookings${suffix ? `?${suffix}` : ''}`);
}

// ─── Sprint Booking PR2a ────────────────────────────────────────────

export type MatchType = 'singles' | 'doubles';
export type BookingType = 'player_match' | 'player_free_play';
export type SlotStatus = 'available' | 'booked' | 'blocked' | 'past' | 'closed';

export interface SpaceAvailabilitySlot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  bookingId?: string;
  bookingType?: string;
  bandType?: string;
}

export interface SpaceAvailability {
  spaceId: string;
  spaceName: string;
  date: string;
  matchType: MatchType;
  granularityMinutes: number;
  defaultDurationMinutes: number;
  slots: SpaceAvailabilitySlot[];
}

/**
 * GET /spaces/:spaceId/availability — grid de slots por dia, retornado
 * pelo HourBandResolver. Status 'available' = bookável; 'booked' = já
 * tem reserva; 'past' = horário passou; 'closed' = fora do horário do
 * Space; 'blocked' = bloqueio operacional (manutenção, etc).
 */
export function getSpaceAvailability(
  spaceId: string,
  date: string,
  matchType?: MatchType,
): Promise<SpaceAvailability> {
  const qs = new URLSearchParams({ date });
  if (matchType) qs.set('matchType', matchType);
  return apiFetch<SpaceAvailability>(`/spaces/${spaceId}/availability?${qs.toString()}`);
}

export interface CreateBookingInput {
  spaceId: string;
  /** ISO datetime (com timezone). Ex: '2026-04-30T19:00:00-03:00'. */
  startsAt: string;
  matchType: MatchType;
  bookingType?: BookingType;
  primaryPlayerId?: string;
  otherPlayers?: (
    | { userId: string }
    | { guest: { firstName: string; lastName: string; email: string } }
  )[];
  notes?: string;
}

/** POST /klubs/:klubId/bookings — cria reserva. */
export function createBooking(klubId: string, input: CreateBookingInput): Promise<BookingListItem> {
  return apiFetch<BookingListItem>(`/klubs/${klubId}/bookings`, {
    method: 'POST',
    json: input,
  });
}

/** GET /bookings/:bookingId — detalhe de 1 reserva. */
export function getBooking(bookingId: string): Promise<BookingListItem> {
  return apiFetch<BookingListItem>(`/bookings/${bookingId}`);
}

/** DELETE /bookings/:bookingId — cancela reserva. */
export function cancelBooking(bookingId: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/bookings/${bookingId}`, { method: 'DELETE' });
}
