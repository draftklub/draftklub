import type { Membership, MembershipType } from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * POST /klubs/:klubId/members — adiciona Membership + RoleAssignment
 * atomicamente (ver `AddMemberHandler` no api). Exige user já existente.
 */
export function addMember(
  klubId: string,
  input: { userId: string; type?: MembershipType; role?: string },
): Promise<Membership> {
  return apiFetch<Membership>(`/klubs/${klubId}/members`, {
    method: 'POST',
    json: input,
  });
}

// NOTA: GET /me/klubs (lista de Klubs do user logado, com role)
// é planejado pra Onda 1 PR3. Quando existir, exportar aqui:
//
//   export function getMyKlubs(): Promise<UserKlubMembership[]> { ... }
