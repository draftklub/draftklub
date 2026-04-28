'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import type { TournamentEntry } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { listTournamentEntries } from '@/lib/api/tournaments';
import { Banner } from '@/components/ui/banner';
import { useTournamentContext } from '../_context';
import { EntriesView } from '../_components';

/**
 * Sprint L PR-L2 — inscritos do torneio. Sub-rota dedicada com fetch
 * isolado das entries.
 */
export default function TournamentEntriesPage() {
  const { tournament, meId, canManage, reload } = useTournamentContext();
  const [entries, setEntries] = React.useState<TournamentEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    listTournamentEntries(tournament.id)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar inscritos.',
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

  if (!entries) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EntriesView
      entries={entries}
      tournament={tournament}
      meId={meId}
      canManage={canManage}
      onChanged={reload}
    />
  );
}
