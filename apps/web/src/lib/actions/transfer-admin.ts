'use server';

import { transferAdminSchema } from '@/lib/schemas/transfer-admin';

export async function transferAdminAction(
  token: string,
  klubId: string,
  raw: unknown,
): Promise<{ klubId: string; oldAdminUserId: string; newAdminUserId: string }> {
  const { email } = transferAdminSchema.parse(raw);

  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${apiUrl}/klubs/${klubId}/role-assignments/transfer-admin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'Erro ao transferir admin.');
  }

  return res.json() as Promise<{ klubId: string; oldAdminUserId: string; newAdminUserId: string }>;
}
