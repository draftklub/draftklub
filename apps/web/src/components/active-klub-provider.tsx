'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import type { Klub } from '@draftklub/shared-types';
import { getKlubBySlug } from '@/lib/api/klubs';
import { ApiError } from '@/lib/api/client';
import { rememberLastKlubSlug } from '@/lib/last-klub-cookie';

interface ActiveKlubContextValue {
  /** Slug lido do segmento `[klubSlug]` da URL. */
  slug: string;
  /** Klub carregado. `null` enquanto loading ou em erro. */
  klub: Klub | null;
  /** `true` enquanto a primeira request ainda não resolveu. */
  isLoading: boolean;
  /**
   * Erro tipado: 404 se o slug não existe; 403 se o user logado não tem
   * membership; outros status como erro de rede.
   */
  error: ActiveKlubError | null;
  /** Re-tenta o fetch (útil em UI de erro de rede). */
  refetch: () => void;
}

export type ActiveKlubError =
  | { type: 'not_found'; slug: string }
  | { type: 'forbidden'; slug: string }
  | { type: 'network'; message: string };

const ActiveKlubContext = React.createContext<ActiveKlubContextValue | null>(null);

/**
 * Provider pra rotas dentro de `/k/[klubSlug]/...`. Resolve o Klub do
 * segmento da URL e cacheia em context pra todos os children sem refetch.
 *
 * Coloque no layout `app/k/[klubSlug]/layout.tsx` (dentro do AuthGuard).
 */
export function ActiveKlubProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ klubSlug: string }>();
  const slug = params.klubSlug;

  const [klub, setKlub] = React.useState<Klub | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<ActiveKlubError | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getKlubBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setKlub(data);
        setIsLoading(false);
        rememberLastKlubSlug(slug);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError({ type: 'not_found', slug });
          } else if (err.status === 403) {
            setError({ type: 'forbidden', slug });
          } else {
            setError({ type: 'network', message: err.message });
          }
        } else {
          setError({
            type: 'network',
            message: err instanceof Error ? err.message : 'Erro desconhecido',
          });
        }
        setKlub(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  const refetch = React.useCallback(() => setReloadToken((n) => n + 1), []);

  const value = React.useMemo<ActiveKlubContextValue>(
    () => ({ slug, klub, isLoading, error, refetch }),
    [slug, klub, isLoading, error, refetch],
  );

  return (
    <ActiveKlubContext.Provider value={value}>{children}</ActiveKlubContext.Provider>
  );
}

/**
 * Hook pra ler o Klub ativo (resolvido pelo `[klubSlug]` da URL). Lança
 * se usado fora do `ActiveKlubProvider`.
 */
export function useActiveKlub(): ActiveKlubContextValue {
  const ctx = React.useContext(ActiveKlubContext);
  if (!ctx) {
    throw new Error('useActiveKlub must be used inside <ActiveKlubProvider>');
  }
  return ctx;
}
