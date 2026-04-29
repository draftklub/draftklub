'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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

  const { data: entries, error: fetchError } = useQuery({
    queryKey: ['tournament-entries', tournament.id],
    queryFn: () => listTournamentEntries(tournament.id),
  });

  const error =
    fetchError instanceof ApiError
      ? fetchError.message
      : fetchError instanceof Error
        ? fetchError.message
        : null;

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
