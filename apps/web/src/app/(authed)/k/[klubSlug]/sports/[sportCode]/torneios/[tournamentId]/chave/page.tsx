'use client';

import * as React from 'react';
import type { TournamentBracket } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { getTournamentBracket } from '@/lib/api/tournaments';
import { Banner } from '@/components/ui/banner';
import { Loader2 } from 'lucide-react';
import { useTournamentContext } from '../_context';
import { BracketView } from '../_components';

/**
 * Sprint L PR-L2 — chave (bracket) do torneio. Sub-rota dedicada;
 * fetch isolado de bracket pra code-split.
 */
export default function TournamentBracketPage() {
  const { tournament, meId, canManage, reload } = useTournamentContext();
  const [bracket, setBracket] = React.useState<TournamentBracket | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    getTournamentBracket(tournament.id)
      .then((b) => {
        if (!cancelled) setBracket(b);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar chave.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tournament.id]);

  if (error) {
    return (
      <Banner tone="error" title="Erro">
        {error}
      </Banner>
    );
  }

  if (!bracket) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BracketView
      bracket={bracket}
      tournament={tournament}
      meId={meId}
      canManage={canManage}
      onChanged={reload}
    />
  );
}
