'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, Calendar, Loader2, Trophy, Users } from 'lucide-react';
import type { TournamentStatus } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubTournaments, type TournamentListItem } from '@/lib/api/tournaments';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Rascunho',
  prequalifying: 'Pré-qualificatória',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const FORMAT_LABELS: Record<string, string> = {
  knockout: 'Eliminatória',
  round_robin: 'Todos contra todos',
  double_elimination: 'Eliminação dupla',
  groups_knockout: 'Grupos + eliminatória',
};

export default function SportTournamentsPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [tournaments, setTournaments] = React.useState<TournamentListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubTournaments(klub.id, sportCode)
      .then((rows) => {
        if (!cancelled) setTournaments(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar torneios.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode]);

  if (!klub) return null;

  // Particiona por status pra UX. Em andamento e prequalifying primeiro,
  // próximos depois (draft com main upcoming), finalizados/cancelados ao fim.
  const grouped = React.useMemo(() => {
    if (!tournaments) return null;
    const live: TournamentListItem[] = [];
    const upcoming: TournamentListItem[] = [];
    const past: TournamentListItem[] = [];
    for (const t of tournaments) {
      if (t.status === 'in_progress' || t.status === 'prequalifying') live.push(t);
      else if (t.status === 'finished' || t.status === 'cancelled') past.push(t);
      else upcoming.push(t);
    }
    return { live, upcoming, past };
  }, [tournaments]);

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
            Torneios
          </h1>
        </header>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : grouped === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tournaments?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Trophy className="size-4" />
            </div>
            <p className="mt-3 font-display text-[14px] font-bold">Nenhum torneio ainda</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              A comissão pode criar torneios via UI (em breve em PR-K2).
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.live.length > 0 ? (
              <Section title="Em andamento" tone="live">
                {grouped.live.map((t) => (
                  <TournamentCard key={t.id} t={t} klubSlug={klub.slug} sportCode={sportCode} />
                ))}
              </Section>
            ) : null}
            {grouped.upcoming.length > 0 ? (
              <Section title="Próximos">
                {grouped.upcoming.map((t) => (
                  <TournamentCard key={t.id} t={t} klubSlug={klub.slug} sportCode={sportCode} />
                ))}
              </Section>
            ) : null}
            {grouped.past.length > 0 ? (
              <Section title="Finalizados / cancelados">
                {grouped.past.map((t) => (
                  <TournamentCard key={t.id} t={t} klubSlug={klub.slug} sportCode={sportCode} />
                ))}
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'live';
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2
        className={cn(
          'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground',
          tone === 'live' && 'text-[hsl(var(--brand-primary-600))]',
        )}
      >
        {tone === 'live' ? (
          <span className="inline-block size-2 animate-pulse rounded-full bg-[hsl(var(--brand-primary-600))]" />
        ) : null}
        {title}
      </h2>
      <ul className="space-y-2">
        {React.Children.map(children, (child, i) => (
          <li key={i}>{child}</li>
        ))}
      </ul>
    </section>
  );
}

function TournamentCard({
  t,
  klubSlug,
  sportCode,
}: {
  t: TournamentListItem;
  klubSlug: string;
  sportCode: string;
}) {
  return (
    <Link
      href={`/k/${klubSlug}/sports/${sportCode}/torneios/${t.id}`}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-[16px] font-bold">{t.name}</h3>
          <StatusBadge status={t.status} />
        </div>
        <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
          <span>{FORMAT_LABELS[t.format] ?? t.format}</span>
          {t.hasPrequalifiers ? <span>· com pré-qualificatória</span> : null}
          <span>· {t.categoryCount} categorias</span>
          <span className="inline-flex items-center gap-1">
            · <Users className="size-3" /> {t.entryCount}
          </span>
          {t.mainStartDate ? (
            <span className="inline-flex items-center gap-1">
              · <Calendar className="size-3" />
              {new Date(t.mainStartDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          ) : null}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function StatusBadge({ status }: { status: TournamentStatus }) {
  const tone =
    status === 'in_progress' || status === 'prequalifying'
      ? 'bg-primary/15 text-[hsl(var(--brand-primary-600))]'
      : status === 'finished'
        ? 'bg-muted text-muted-foreground'
        : status === 'cancelled'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
