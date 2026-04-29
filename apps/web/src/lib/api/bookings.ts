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

/**
 * DELETE /bookings/:bookingId — cancela reserva. Backend exige body
 * com `reason` (10-500 chars).
 */
export function cancelBooking(bookingId: string, reason: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/bookings/${bookingId}`, {
    method: 'DELETE',
    json: { reason },
  });
}

// ─── Sprint Polish PR-B ─────────────────────────────────────────────

export interface MyBookingExtensionSummary {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  extendedTo: string;
  requestedById: string;
}

export interface MyBookingItem {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  notes: string | null;
  matchType: string | null;
  bookingType: string;
  primaryPlayerId: string | null;
  klub: { id: string; slug: string; name: string };
  space: { id: string; name: string; type: string };
  extensions: MyBookingExtensionSummary[];
}

/**
 * GET /me/bookings — lista cross-klub das reservas do user logado.
 * Sprint N batch 4 — agora paginado com cursor. Default limit=50.
 * Caller que só quer "primeira página" usa `listMyBookings()`; load
 * more passa `{ cursor }`.
 */
export interface MyBookingsPage {
  items: MyBookingItem[];
  nextCursor: string | null;
}

export function listMyBookings(params?: {
  cursor?: string;
  limit?: number;
}): Promise<MyBookingsPage> {
  const qs = new URLSearchParams();
  if (params?.cursor) qs.set('cursor', params.cursor);
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<MyBookingsPage>(`/me/bookings${suffix}`);
}

// ─── Sprint Polish PR-C ─────────────────────────────────────────────

export type AddPlayerInput =
  | { userId: string }
  | { guest: { firstName: string; lastName: string; email: string } };

/** POST /bookings/:bookingId/players — só primary player ou staff. */
export function addPlayersToBooking(
  bookingId: string,
  players: AddPlayerInput[],
): Promise<{ id: string; otherPlayers: { userId: string; name: string }[] }> {
  return apiFetch(`/bookings/${bookingId}/players`, {
    method: 'POST',
    json: { players },
  });
}

export interface BookingExtension {
  id: string;
  extendedFrom: string;
  extendedTo: string;
  mode: 'player' | 'staff_approval' | 'staff_only';
  status: 'approved' | 'pending' | 'rejected';
  requestedById: string;
  requestedAt: string;
  decidedById?: string;
  decidedAt?: string;
  decisionReason?: string;
}

/** POST /bookings/:bookingId/extensions — pede extensão. */
export function requestExtension(
  bookingId: string,
  additionalMinutes: number,
  notes?: string,
): Promise<{ id: string; status: string; extension: BookingExtension }> {
  return apiFetch(`/bookings/${bookingId}/extensions`, {
    method: 'POST',
    json: { additionalMinutes, notes },
  });
}

/** PATCH /bookings/:bookingId/extensions/:extensionId/approve — staff aprova. */
export function approveExtension(
  bookingId: string,
  extensionId: string,
): Promise<{ id: string; endsAt: string }> {
  return apiFetch(`/bookings/${bookingId}/extensions/${extensionId}/approve`, {
    method: 'PATCH',
    json: {},
  });
}

/** PATCH /bookings/:bookingId/extensions/:extensionId/reject — staff rejeita. */
export function rejectExtension(
  bookingId: string,
  extensionId: string,
  reason?: string,
): Promise<{ id: string }> {
  return apiFetch(`/bookings/${bookingId}/extensions/${extensionId}/reject`, {
    method: 'PATCH',
    json: { reason },
  });
}

export interface PendingExtensionItem {
  bookingId: string;
  spaceName: string | null;
  primaryPlayerId: string | null;
  primaryPlayerName: string | null;
  startsAt: string;
  endsAt: string | null;
  extension: BookingExtension;
  requestedByName: string | null;
}

/** GET /klubs/:klubId/extensions/pending — admin Klub vê extensões aguardando aprovação. */
export function listPendingExtensions(klubId: string): Promise<PendingExtensionItem[]> {
  return apiFetch<PendingExtensionItem[]>(`/klubs/${klubId}/extensions/pending`);
}
