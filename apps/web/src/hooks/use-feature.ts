'use client';

import * as React from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import { getFeatures } from '@/lib/api/features';
import type { FeatureItem } from '@/lib/api/features';

export type FeatureTier = 'free' | 'premium' | 'disabled';

export interface FeatureState {
  enabled: boolean;
  tier: FeatureTier;
  loading: boolean;
  error: boolean;
}

// Cache escopado por userId — evita que dois usuários com tiers diferentes
// no mesmo browser compartilhem dados de features (ex: logout + novo login
// sem reload de página).
// staleTime: 5 minutes — alinhado com Cache-Control do endpoint.
const STALE_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: FeatureItem[];
  fetchedAt: number;
}

const cacheByUser = new Map<string, CacheEntry>();
const inflightByUser = new Map<string, Promise<FeatureItem[]>>();

function getCurrentUserId(): string {
  return getFirebaseAuth().currentUser?.uid ?? '__anonymous__';
}

async function fetchFeatures(): Promise<FeatureItem[]> {
  const userId = getCurrentUserId();
  const now = Date.now();
  const cached = cacheByUser.get(userId);
  if (cached && now - cached.fetchedAt < STALE_MS) return cached.data;

  const existing = inflightByUser.get(userId);
  if (existing) return existing;

  const promise = getFeatures()
    .then((data) => {
      cacheByUser.set(userId, { data, fetchedAt: Date.now() });
      inflightByUser.delete(userId);
      return data;
    })
    .catch((err) => {
      inflightByUser.delete(userId);
      throw err;
    });

  inflightByUser.set(userId, promise);
  return promise;
}

/**
 * Retorna o estado de acesso de uma feature para o usuário logado.
 * O servidor já resolve `enabled` levando em conta o tier do usuário —
 * o hook expõe o valor resolvido + fallback para erros de rede.
 *
 * Fallback quando /features falha:
 *   tier 'free'     → enabled: true
 *   tier 'premium'  → enabled: false
 *   tier 'disabled' → enabled: false
 *   desconhecido    → enabled: false
 */
export function useFeature(id: string): FeatureState {
  const [features, setFeatures] = React.useState<FeatureItem[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    // If cache is warm for this user, resolve immediately.
    const userId = getCurrentUserId();
    const cached = cacheByUser.get(userId);
    if (cached && Date.now() - cached.fetchedAt < STALE_MS) {
      setFeatures(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchFeatures()
      .then((data) => {
        if (!cancelled) {
          setFeatures(data);
          setLoading(false);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const feature = features?.find((f) => f.id === id);

  if (loading) {
    return { enabled: false, tier: 'free', loading: true, error: false };
  }

  if (error || !feature) {
    // Fallback: free → open, everything else → closed.
    return {
      enabled: feature?.tier === 'free',
      tier: feature?.tier ?? 'free',
      loading: false,
      error: true,
    };
  }

  return {
    enabled: feature.enabled,
    tier: feature.tier,
    loading: false,
    error: false,
  };
}

/**
 * Invalida o cache do usuário atual. Chamar após PATCH /features/:id
 * bem-sucedido ou após login/logout para garantir que o próximo
 * useFeature busque dados frescos com o tier correto.
 */
export function invalidateFeaturesCache(): void {
  const userId = getCurrentUserId();
  cacheByUser.delete(userId);
}
