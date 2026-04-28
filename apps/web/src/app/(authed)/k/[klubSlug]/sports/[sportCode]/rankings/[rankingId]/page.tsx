'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { RankingDetail, RankingPlayerEntry } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getRanking } from '@/lib/api/rankings';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const ORDER_BY_LABELS: Record<string, string> = {
  rating: 'Rating',
  tournament_points: 'Pontos de torneio',
  combined: 'Combinado',
};

const ENGINE_LABELS: Record<string, string> = {
  elo: 'Elo',
  win_loss: 'Win/Loss',
  points: 'Pontos',
};

export default function RankingDetailPage() {
  const params = useParams<{ klubSlug: string; sportCode: string; rankingId: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const rankingId = params.rankingId;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [data, setData] = React.useState<RankingDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    getRanking(klub.id, sportCode, rankingId)
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar ranking.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode, rankingId]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href={`/k/${klub.slug}/sports/${sportCode}/rankings`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Rankings · {sportLabel}
        </Link>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : data === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <header>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
                {klub.commonName ?? klub.name} · {sportLabel}
              </p>
              <h1
                className="mt-1 font-display text-[26px] font-bold leading-tight md:text-[32px]"
                style={{ letterSpacing: '-0.02em' }}
              >
                {data.name}
              </h1>
              <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
                <span>{data.type}</span>
                {data.gender ? <span>· {data.gender}</span> : null}
                {data.ageMin || data.ageMax ? (
                  <span>
                    · {data.ageMin ?? 0}–{data.ageMax ?? '∞'} anos
                  </span>
                ) : null}
                <span>· engine {ENGINE_LABELS[data.ratingEngine] ?? data.ratingEngine}</span>
                <span>· ordenado por {ORDER_BY_LABELS[data.orderBy] ?? data.orderBy}</span>
              </p>
            </header>

            <PlayerTable players={data.players} orderBy={data.orderBy} />
          </>
        )}
      </div>
    </main>
  );
}

function PlayerTable({ players, orderBy }: { players: RankingPlayerEntry[]; orderBy: string }) {
  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-display text-[14px] font-bold">Sem jogadores ainda</p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Players são enrolados no ranking quando comissão aprova ou via primeira partida.
        </p>
      </div>
    );
  }

  const showPoints = orderBy === 'tournament_points' || orderBy === 'combined';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full table-fixed text-[13px]">
        <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Jogador</th>
            <th className="w-16 px-3 py-2 text-right font-semibold">Rating</th>
            {showPoints ? (
              <th className="hidden w-16 px-3 py-2 text-right font-semibold sm:table-cell">
                Pontos
              </th>
            ) : null}
            <th className="hidden w-20 px-3 py-2 text-right font-semibold sm:table-cell">V/D</th>
            <th className="w-12 px-3 py-2 text-right font-semibold">Δ</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.userId} className="border-t border-border first:border-t-0">
              <td className="px-3 py-2.5 font-display text-[13.5px] font-bold tabular-nums">
                {p.position}
              </td>
              <td className="truncate px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="size-7 rounded-full bg-muted object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                      {p.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="truncate">{p.fullName}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{p.rating}</td>
              {showPoints ? (
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">
                  {p.tournamentPoints}
                </td>
              ) : null}
              <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                {p.wins}/{p.losses}
              </td>
              <td className="px-3 py-2.5 text-right">
                <RatingDelta delta={p.lastRatingChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <Minus className="ml-auto inline size-3 text-muted-foreground" />;
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums',
        positive ? 'text-[hsl(142_71%_32%)]' : 'text-destructive',
      )}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? '+' : ''}
      {delta}
    </span>
  );
}
