'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { getTournamentBracket } from '@/lib/api/tournaments';
import { Banner } from '@/components/ui/banner';
import { useTournamentContext } from '../_context';
import { BracketView } from '../_components';

/**
 * Sprint L PR-L2 — chave (bracket) do torneio. Sub-rota dedicada;
 * fetch isolado de bracket pra code-split.
 */
export default function TournamentBracketPage() {
  const { tournament, meId, canManage, reload } = useTournamentContext();

  const { data: bracket, error: fetchError } = useQuery({
    queryKey: ['tournament-bracket', tournament.id],
    queryFn: () => getTournamentBracket(tournament.id),
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
