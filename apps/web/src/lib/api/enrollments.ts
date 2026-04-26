import type { PlayerSportEnrollment } from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * POST /klubs/:klubId/sports/:sportCode/enrollments — player solicita
 * inscrição. Status inicial `pending`.
 */
export function requestEnrollment(
  klubId: string,
  sportCode: string,
): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(
    `/klubs/${klubId}/sports/${sportCode}/enrollments`,
    { method: 'POST' },
  );
}

/**
 * POST /klubs/:klubId/sports/:sportCode/enrollments/admin — comissão
 * cria direto com status `active`.
 */
export function createEnrollmentDirect(
  klubId: string,
  sportCode: string,
  userId: string,
): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(
    `/klubs/${klubId}/sports/${sportCode}/enrollments/admin`,
    { method: 'POST', json: { userId } },
  );
}

/** GET /klubs/:klubId/sports/:sportCode/enrollments — lista da modalidade. */
export function listEnrollmentsByProfile(
  klubId: string,
  sportCode: string,
): Promise<PlayerSportEnrollment[]> {
  return apiFetch<PlayerSportEnrollment[]>(
    `/klubs/${klubId}/sports/${sportCode}/enrollments`,
  );
}

/** GET /users/:userId/enrollments — lista por user. */
export function listEnrollmentsByUser(userId: string): Promise<PlayerSportEnrollment[]> {
  return apiFetch<PlayerSportEnrollment[]>(`/users/${userId}/enrollments`);
}

export function approveEnrollment(id: string): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(`/enrollments/${id}/approve`, {
    method: 'PATCH',
  });
}

export function rejectEnrollment(id: string, reason?: string): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(`/enrollments/${id}/reject`, {
    method: 'PATCH',
    json: reason ? { reason } : undefined,
  });
}

export function suspendEnrollment(id: string, reason?: string): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(`/enrollments/${id}/suspend`, {
    method: 'PATCH',
    json: reason ? { reason } : undefined,
  });
}

export function reactivateEnrollment(id: string): Promise<PlayerSportEnrollment> {
  return apiFetch<PlayerSportEnrollment>(`/enrollments/${id}/reactivate`, {
    method: 'PATCH',
  });
}

export function cancelEnrollment(id: string): Promise<void> {
  return apiFetch<void>(`/enrollments/${id}`, { method: 'DELETE' });
}
