import type { HourBand, MatchType, Space, SpaceType } from '@draftklub/shared-types';
import { apiFetch } from './client';

export interface CreateSpaceInput {
  name: string;
  type?: SpaceType;
  sportCode?: 'tennis' | 'padel' | 'squash' | 'beach_tennis';
  surface?: 'clay' | 'hard' | 'grass' | 'synthetic' | 'carpet';
  indoor?: boolean;
  hasLighting?: boolean;
  maxPlayers?: number;
  description?: string;
  slotGranularityMinutes?: number;
  slotDefaultDurationMinutes?: number;
  hourBands?: HourBand[];
  allowedMatchTypes?: MatchType[];
}

export interface UpdateSpaceInput extends Partial<CreateSpaceInput> {
  status?: 'active' | 'maintenance' | 'inactive';
  bookingActive?: boolean;
}

export function listKlubSpaces(klubId: string): Promise<Space[]> {
  return apiFetch<Space[]>(`/klubs/${klubId}/spaces`);
}

export function createSpace(klubId: string, input: CreateSpaceInput): Promise<Space> {
  return apiFetch<Space>(`/klubs/${klubId}/spaces`, {
    method: 'POST',
    json: input,
  });
}

export function updateSpace(
  klubId: string,
  spaceId: string,
  input: UpdateSpaceInput,
): Promise<Space> {
  return apiFetch<Space>(`/klubs/${klubId}/spaces/${spaceId}`, {
    method: 'PATCH',
    json: input,
  });
}
