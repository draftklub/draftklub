'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, ListOrdered, Loader2, Users } from 'lucide-react';
import type { RankingListItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubRankings } from '@/lib/api/rankings';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const RANKING_TYPE_LABELS: Record<string, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  mixed: 'Mixed',
};

const ENGINE_LABELS: Record<string, string> = {
  elo: 'Elo',
  win_loss: 'Win/Loss',
  points: 'Pontos',
};

export default function SportRankingsPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [rankings, setRankings] = React.useState<RankingListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubRankings(klub.id, sportCode)
      .then((rows) => {
        if (!cancelled) setRankings(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar rankings.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href={`/k/${klub.slug}/sports/${sportCode}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {sportLabel}
        </Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            {klub.commonName ?? klub.name} · {sportLabel}
          </p>
          <h1
            className="mt-1 font-display text-[26px] font-bold leading-tight md:text-[32px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Rankings
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Rankings ativos dessa modalidade. Cada um pode ter elegibilidade própria (gênero, faixa
            etária) e engine de rating distinta.
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : rankings === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <ListOrdered className="size-4" />
            </div>
            <p className="mt-3 font-display text-[14px] font-bold">Nenhum ranking ainda</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              A comissão dessa modalidade pode criar rankings (em breve via UI).
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rankings.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/k/${klub.slug}/sports/${sportCode}/rankings/${r.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-[16px] font-bold">{r.name}</h2>
                      <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[hsl(var(--brand-primary-600))]">
                        {RANKING_TYPE_LABELS[r.type] ?? r.type}
                      </span>
                      <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {ENGINE_LABELS[r.ratingEngine] ?? r.ratingEngine}
                      </span>
                    </div>
                    <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" />
                        {r.playerCount} {r.playerCount === 1 ? 'jogador' : 'jogadores'}
                      </span>
                      {r.gender ? <span>· {r.gender}</span> : null}
                      {r.ageMin || r.ageMax ? (
                        <span>
                          · {r.ageMin ?? 0}–{r.ageMax ?? '∞'} anos
                        </span>
                      ) : null}
                      <span>· rating inicial {r.initialRating}</span>
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
