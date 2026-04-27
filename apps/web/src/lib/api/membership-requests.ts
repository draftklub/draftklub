import type {
  MembershipRequest,
  MembershipRequestAdminItem,
  MembershipRequestForUser,
  MembershipRequestStatus,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/** Solicitar entrada em Klub privado (accessMode='private'). */
export interface RequestMembershipInput {
  message: string;
  attachmentUrl?: string;
}

export function requestMembership(
  klubSlug: string,
  input: RequestMembershipInput,
): Promise<{ id: string; klubId: string }> {
  return apiFetch(`/klubs/slug/${klubSlug}/request-join`, {
    method: 'POST',
    json: input,
  });
}

/** GET /me/membership-requests — minhas solicitações. */
export function listMyMembershipRequests(): Promise<MembershipRequestForUser[]> {
  return apiFetch<MembershipRequestForUser[]>('/me/membership-requests');
}

/** Cancelar solicitação pendente própria. */
export function cancelMyMembershipRequest(id: string): Promise<{ id: string }> {
  return apiFetch(`/me/membership-requests/${id}`, { method: 'DELETE' });
}

// ─── Admin (KLUB_ADMIN do Klub) ────────────────────────────────

export interface ListMembershipRequestsParams {
  status?: MembershipRequestStatus;
  limit?: number;
}

export function listKlubMembershipRequests(
  klubId: string,
  p: ListMembershipRequestsParams = {},
): Promise<MembershipRequestAdminItem[]> {
  const qs = new URLSearchParams();
  if (p.status) qs.set('status', p.status);
  if (p.limit) qs.set('limit', String(p.limit));
  const suffix = qs.toString();
  return apiFetch<MembershipRequestAdminItem[]>(
    `/klubs/${klubId}/membership-requests${suffix ? `?${suffix}` : ''}`,
  );
}

export function approveMembershipRequest(
  klubId: string,
  reqId: string,
): Promise<{ id: string }> {
  return apiFetch(`/klubs/${klubId}/membership-requests/${reqId}/approve`, {
    method: 'POST',
  });
}

export function rejectMembershipRequest(
  klubId: string,
  reqId: string,
  reason: string,
): Promise<{ id: string }> {
  return apiFetch(`/klubs/${klubId}/membership-requests/${reqId}/reject`, {
    method: 'POST',
    json: { reason },
  });
}

export type { MembershipRequest, MembershipRequestAdminItem, MembershipRequestForUser };
