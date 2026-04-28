import { apiFetch } from './client';
import type { FeatureItem } from './features';

export type { FeatureItem };

export interface PatchFeatureInput {
  tier?: 'free' | 'premium' | 'disabled';
  enabled?: boolean;
}

export function patchFeature(id: string, input: PatchFeatureInput): Promise<FeatureItem> {
  return apiFetch<FeatureItem>(`/features/${id}`, { method: 'PATCH', json: input });
}
