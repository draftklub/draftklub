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
  return apiFetch<BookingListItem[]>(
    `/klubs/${klubId}/bookings${suffix ? `?${suffix}` : ''}`,
  );
}
