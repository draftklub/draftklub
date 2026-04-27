import type {
  AdminPendingKlubDetail,
  AdminPendingKlubsPage,
  KlubReviewStatus,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

export interface ListPendingKlubsParams {
  type?: 'pj' | 'pf';
  status?: KlubReviewStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export function listPendingKlubs(p: ListPendingKlubsParams = {}): Promise<AdminPendingKlubsPage> {
  const qs = new URLSearchParams();
  if (p.type) qs.set('type', p.type);
  if (p.status) qs.set('status', p.status);
  if (p.q) qs.set('q', p.q);
  if (p.page) qs.set('page', String(p.page));
  if (p.limit) qs.set('limit', String(p.limit));
  const suffix = qs.toString();
  return apiFetch<AdminPendingKlubsPage>(`/admin/klubs/pending${suffix ? `?${suffix}` : ''}`);
}

export function getPendingKlub(id: string): Promise<AdminPendingKlubDetail> {
  return apiFetch<AdminPendingKlubDetail>(`/admin/klubs/${id}`);
}

export interface UpdatePendingKlubInput {
  name?: string;
  slug?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export function updatePendingKlub(
  id: string,
  input: UpdatePendingKlubInput,
): Promise<{ id: string; slug: string }> {
  return apiFetch<{ id: string; slug: string }>(`/admin/klubs/${id}`, {
    method: 'PATCH',
    json: input,
  });
}

export function approveKlub(id: string): Promise<{ id: string; slug: string }> {
  return apiFetch<{ id: string; slug: string }>(`/admin/klubs/${id}/approve`, {
    method: 'POST',
  });
}

export function rejectKlub(id: string, reason: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/admin/klubs/${id}/reject`, {
    method: 'POST',
    json: { reason },
  });
}
