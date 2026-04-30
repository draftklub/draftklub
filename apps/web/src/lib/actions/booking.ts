'use server';

import { bookingSchema } from '@/lib/schemas/booking';

export async function createBookingAction(token: string, raw: unknown): Promise<{ id: string }> {
  const data = bookingSchema.parse(raw);
  const { klubId, ...input } = data;

  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${apiUrl}/klubs/${klubId}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'Erro ao criar reserva.');
  }

  return res.json() as Promise<{ id: string }>;
}
