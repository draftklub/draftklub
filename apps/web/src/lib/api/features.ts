import { apiFetch } from './client';

export interface FeatureItem {
  id: string;
  tier: 'free' | 'premium' | 'disabled';
  enabled: boolean;
  rolloutPct: number;
}

export function getFeatures(): Promise<FeatureItem[]> {
  return apiFetch<FeatureItem[]>('/features');
}
