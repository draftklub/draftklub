import { apiFetch } from './client';

export interface CreateKlubRequestInput {
  name: string;
  type?: 'sports_club' | 'condo' | 'school' | 'public_space' | 'academy' | 'individual';
  city: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  sportCodes?: string[];
  estimatedMembers?: number;
  message?: string;
}

/**
 * POST /klub-requests — endpoint público (sales-led intake). Registra
 * um pedido pra ser contactado pelo time DraftKlub.
 */
export function createKlubRequest(input: CreateKlubRequestInput): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/klub-requests', {
    method: 'POST',
    json: input,
    anonymous: true,
  });
}
