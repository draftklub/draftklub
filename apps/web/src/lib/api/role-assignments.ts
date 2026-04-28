import type {
  GrantKlubRoleInput,
  GrantPlatformRoleInput,
  RoleAssignmentListItem,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/** Sprint Polish PR-J2 — clients pra endpoints de gestão de roles. */

export function listPlatformRoleAssignments(): Promise<RoleAssignmentListItem[]> {
  return apiFetch<RoleAssignmentListItem[]>('/platform/role-assignments');
}

export function grantPlatformAdmin(
  input: GrantPlatformRoleInput,
): Promise<{ id: string; userId: string }> {
  return apiFetch<{ id: string; userId: string }>('/platform/role-assignments', {
    method: 'POST',
    json: input,
  });
}

export function revokePlatformRole(assignmentId: string): Promise<void> {
  return apiFetch<void>(`/platform/role-assignments/${assignmentId}`, { method: 'DELETE' });
}

export function listKlubRoleAssignments(klubId: string): Promise<RoleAssignmentListItem[]> {
  return apiFetch<RoleAssignmentListItem[]>(`/klubs/${klubId}/role-assignments`);
}

export function grantKlubRole(
  klubId: string,
  input: GrantKlubRoleInput,
): Promise<{ id: string; userId: string }> {
  return apiFetch<{ id: string; userId: string }>(`/klubs/${klubId}/role-assignments`, {
    method: 'POST',
    json: input,
  });
}

export function revokeKlubRole(klubId: string, assignmentId: string): Promise<void> {
  return apiFetch<void>(`/klubs/${klubId}/role-assignments/${assignmentId}`, {
    method: 'DELETE',
  });
}

/** Sprint Polish PR-J3 — transferência de KLUB_ADMIN. Old admin sai limpo. */
export function transferKlubAdmin(
  klubId: string,
  email: string,
): Promise<{ klubId: string; oldAdminUserId: string; newAdminUserId: string }> {
  return apiFetch(`/klubs/${klubId}/role-assignments/transfer-admin`, {
    method: 'POST',
    json: { email },
  });
}
