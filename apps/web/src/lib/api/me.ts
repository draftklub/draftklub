import type { MeResponse } from '@draftklub/shared-types';
import { apiFetch } from './client';

/** GET /me — identidade do user logado + roleAssignments. */
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me');
}
