'use client';

import * as React from 'react';
import Link from 'next/link';
import { ListOrdered, Loader2, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { getMyKlubs } from '@/lib/api/me';
import { listKlubRankings } from '@/lib/api/rankings';
import { EmptyState } from '@/components/ui/empty-state';
import { Banner } from '@/components/ui/banner';
import type { RankingListItem, UserKlubMembership } from '@draftklub/shared-types';

interface RankingRow {
  ranking: RankingListItem;
  klubSlug: string;
  klubName: string;
  klubCommonName: string | null;
  sportCode: string;
}

const SPORT_LABEL: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  beach_tennis: 'Beach Tennis',
  squash: 'Squash',
  badminton: 'Badminton',
  pickleball: 'Pickleball',
};

const ENGINE_LABEL: Record<string, string> = {
  elo: 'Elo',
  points: 'Pontos',
  win_loss: 'W/L',
};

const TYPE_LABEL: Record<string, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  mixed: 'Misto',
};

export default function RankingsPage() {
  const { user } = useAuth();

  const { data: klubs = [], isLoading: klubsLoading } = useQuery<UserKlubMembership[]>({
    queryKey: ['my-klubs'],
    queryFn: getMyKlubs,
    enabled: !!user,
  });

  const {
    data: rows = [],
    isLoading: rankingsLoading,
    error,
  } = useQuery<RankingRow[]>({
    queryKey: ['my-rankings', klubs.map((k) => k.klubId)],
    queryFn: async () => {
      const result: RankingRow[] = [];
      await Promise.all(
        klubs.flatMap((klub) =>
          klub.sports.map(async (sportCode) => {
            try {
              const rankings = await listKlubRankings(klub.klubId, sportCode);
              rankings
                .filter((r) => r.active)
                .forEach((r) =>
                  result.push({
                    ranking: r,
                    klubSlug: klub.klubSlug,
                    klubName: klub.klubName,
                    klubCommonName: klub.klubCommonName,
                    sportCode,
                  }),
                );
            } catch {
              // sport may have no rankings — skip silently
            }
          }),
        ),
      );
      return result.sort((a, b) => a.ranking.name.localeCompare(b.ranking.name));
    },
    enabled: klubs.length > 0,
  });

  const isLoading = klubsLoading || rankingsLoading;
  const errorMsg = error instanceof Error ? error.message : null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <h1
            className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            Rankings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rankings ativos em todos os Klubs e modalidades em que você participa.
          </p>
        </header>

        {errorMsg ? (
          <Banner tone="error">{errorMsg}</Banner>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhum ranking encontrado"
            description="Você ainda não participa de nenhum Klub com rankings ativos."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={`${row.ranking.id}-${row.sportCode}`}>
                <RankingCard row={row} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function RankingCard({ row }: { row: RankingRow }) {
  const { ranking, klubSlug, klubName, klubCommonName, sportCode } = row;
  const href = `/k/${klubSlug}/sports/${sportCode}/rankings/${ranking.id}`;
  const sportLabel = SPORT_LABEL[sportCode] ?? sportCode;
  const engineLabel = ENGINE_LABEL[ranking.ratingEngine] ?? ranking.ratingEngine;
  const typeLabel = TYPE_LABEL[ranking.type] ?? ranking.type;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm font-bold">{ranking.name}</p>
          <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-xs font-bold uppercase tracking-wider text-brand-primary-600">
            {sportLabel}
          </span>
          <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {typeLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{klubCommonName ?? klubName}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListOrdered className="size-3" />
            {engineLabel}
          </span>
          <span>{ranking.playerCount} participantes</span>
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
