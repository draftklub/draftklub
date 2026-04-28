'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Crown,
  Loader2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  TournamentBracket,
  TournamentDetail,
  TournamentEntry,
  TournamentMatchView,
  TournamentStatus,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getTournament, getTournamentBracket, listTournamentEntries } from '@/lib/api/tournaments';
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

type TabId = 'overview' | 'bracket' | 'entries';

export default function TournamentDetailPage() {
  const params = useParams<{ klubSlug: string; sportCode: string; tournamentId: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const tournamentId = params.tournamentId;

  const [tab, setTab] = React.useState<TabId>('overview');
  const [tournament, setTournament] = React.useState<TournamentDetail | null>(null);
  const [bracket, setBracket] = React.useState<TournamentBracket | null>(null);
  const [entries, setEntries] = React.useState<TournamentEntry[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void Promise.all([
      getTournament(klub.id, sportCode, tournamentId),
      getTournamentBracket(tournamentId).catch(() => null),
      listTournamentEntries(tournamentId).catch(() => null),
    ])
      .then(([t, b, e]) => {
        if (cancelled) return;
        setTournament(t);
        setBracket(b);
        setEntries(e);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar torneio.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode, tournamentId]);

  if (!klub) return null;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          href={`/k/${klub.slug}/sports/${sportCode}/torneios`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Torneios · {sportLabel}
        </Link>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : tournament === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Header
              tournament={tournament}
              klubName={klub.commonName ?? klub.name}
              sportLabel={sportLabel}
            />
            <TabBar active={tab} onSelect={setTab} />
            <div className="pt-2">
              {tab === 'overview' ? <Overview tournament={tournament} /> : null}
              {tab === 'bracket' ? <BracketView bracket={bracket} /> : null}
              {tab === 'entries' ? <EntriesView entries={entries} tournament={tournament} /> : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────

function Header({
  tournament,
  klubName,
  sportLabel,
}: {
  tournament: TournamentDetail;
  klubName: string;
  sportLabel: string;
}) {
  return (
    <header>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
        {klubName} · {sportLabel}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1
          className="font-display text-[26px] font-bold leading-tight md:text-[32px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {tournament.name}
        </h1>
        <StatusBadge status={tournament.status} />
      </div>
      {tournament.description ? (
        <p className="mt-2 text-[13.5px] text-muted-foreground">{tournament.description}</p>
      ) : null}
      <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
        <span>{FORMAT_LABELS[tournament.format] ?? tournament.format}</span>
        {tournament.hasPrequalifiers ? <span>· com pré-qualificatória</span> : null}
        <span>· {tournament.categories.length} categorias</span>
        <span className="inline-flex items-center gap-1">
          · <Users className="size-3" /> {tournament.entryCount} inscritos
        </span>
      </p>
    </header>
  );
}

// ─── Tab bar ────────────────────────────────────────────────────────────

function TabBar({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'bracket', label: 'Chave' },
    { id: 'entries', label: 'Inscritos' },
  ];
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-border md:mx-0">
      <ul className="flex min-w-max gap-1 px-4 md:px-0">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={cn(
                  'relative inline-flex h-10 items-center px-3 text-[13px] font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
                {isActive ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t-full bg-primary" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Overview tab ───────────────────────────────────────────────────────

function Overview({ tournament }: { tournament: TournamentDetail }) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateCard
          label="Inscrições"
          start={tournament.registrationOpensAt}
          end={tournament.registrationClosesAt}
        />
        <DateCard label="Sorteio" start={tournament.drawDate} />
        {tournament.hasPrequalifiers ? (
          <DateCard
            label="Pré-qualificatória"
            start={tournament.prequalifierStartDate}
            end={tournament.prequalifierEndDate}
          />
        ) : null}
        <DateCard
          label="Fase principal"
          start={tournament.mainStartDate}
          end={tournament.mainEndDate}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Categorias
        </h3>
        {tournament.categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
            Sem categorias configuradas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tournament.categories
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <p className="font-display text-[14px] font-bold">{c.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.maxPlayers ? `Até ${c.maxPlayers} players · ` : ''}
                    {c.minRatingExpected || c.maxRatingExpected
                      ? `rating ${c.minRatingExpected ?? '–'} a ${c.maxRatingExpected ?? '∞'}`
                      : 'sem restrição de rating'}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>

      {tournament.cancelledAt ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-display text-[13px] font-bold text-destructive">Torneio cancelado</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Em {new Date(tournament.cancelledAt).toLocaleDateString('pt-BR')}
            {tournament.cancellationReason ? ` — ${tournament.cancellationReason}` : ''}.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function DateCard({
  label,
  start,
  end,
}: {
  label: string;
  start: string | null;
  end?: string | null;
}) {
  if (!start) return null;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const sameDay = endDate?.toDateString() === startDate.toDateString();
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center gap-1.5 font-display text-[14px] font-bold">
        <Calendar className="size-3.5 text-muted-foreground" />
        {startDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </p>
      {endDate && !sameDay ? (
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          até{' '}
          {endDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      ) : null}
    </div>
  );
}

// ─── Bracket view ───────────────────────────────────────────────────────

function BracketView({ bracket }: { bracket: TournamentBracket | null }) {
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (bracket && bracket.categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(bracket.categories[0]?.id ?? null);
    }
  }, [bracket, activeCategoryId]);

  if (!bracket) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Chave ainda não disponível. Torneio precisa ter sido sorteado primeiro.
      </p>
    );
  }

  if (bracket.categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Nenhuma categoria com matches gerados.
      </p>
    );
  }

  const activeCategory =
    bracket.categories.find((c) => c.id === activeCategoryId) ?? bracket.categories[0];
  if (!activeCategory) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Categoria não encontrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {bracket.categories.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {bracket.categories.map((c) => {
            const isActive = c.id === activeCategoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-3 text-[12px] font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <BracketByPhases matches={activeCategory.matches} />
    </div>
  );
}

/**
 * Render simples do bracket: agrupa por phase e mostra matches em colunas
 * verticais. Funciona pra knockout, double-elimination (winners/losers
 * separados via matchKind), round-robin (cada round = phase) e groups+
 * knockout (phases group_A/B/... + knockout). Não desenha linhas conectoras
 * — visualização é grid simples por fase.
 */
function BracketByPhases({ matches }: { matches: TournamentMatchView[] }) {
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Sem matches gerados.
      </p>
    );
  }

  // Agrupa por phase. Se houver matchKind!=main, separa em grupos.
  const byPhase = React.useMemo(() => {
    const winners = new Map<string, TournamentMatchView[]>();
    const losers = new Map<string, TournamentMatchView[]>();
    const groups = new Map<string, TournamentMatchView[]>();
    const grandFinal: TournamentMatchView[] = [];

    for (const m of matches) {
      const target =
        m.matchKind === 'losers'
          ? losers
          : m.matchKind === 'group'
            ? groups
            : m.matchKind === 'grand_final'
              ? null
              : winners;
      if (target === null) {
        grandFinal.push(m);
        continue;
      }
      const arr = target.get(m.phase) ?? [];
      arr.push(m);
      target.set(m.phase, arr);
    }

    function sortMatches(arr: TournamentMatchView[]) {
      return arr.slice().sort((a, b) => a.slotTop - b.slotTop);
    }

    return {
      winners: Array.from(winners.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      losers: Array.from(losers.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      groups: Array.from(groups.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      grandFinal: sortMatches(grandFinal),
    };
  }, [matches]);

  const hasLosers = byPhase.losers.length > 0;
  const hasGroups = byPhase.groups.length > 0;

  return (
    <div className="space-y-5">
      {hasGroups ? <BracketSection title="Fase de grupos" phases={byPhase.groups} /> : null}
      <BracketSection
        title={hasLosers ? 'Chave principal (winners)' : null}
        phases={byPhase.winners}
      />
      {hasLosers ? <BracketSection title="Repescagem (losers)" phases={byPhase.losers} /> : null}
      {byPhase.grandFinal.length > 0 ? (
        <BracketSection
          title="Final"
          phases={[{ phase: 'grand_final', matches: byPhase.grandFinal }]}
        />
      ) : null}
    </div>
  );
}

function BracketSection({
  title,
  phases,
}: {
  title: string | null;
  phases: { phase: string; matches: TournamentMatchView[] }[];
}) {
  if (phases.length === 0) return null;
  return (
    <section className="space-y-2">
      {title ? (
        <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-3">
          {phases.map((p) => (
            <div key={p.phase} className="w-[240px] shrink-0 space-y-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                {labelPhase(p.phase)}
              </p>
              {p.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function labelPhase(phase: string): string {
  const map: Record<string, string> = {
    final: 'Final',
    semifinal: 'Semifinal',
    quarter: 'Quartas',
    round_of_16: 'Oitavas',
    round_of_32: '16-avos',
    round_of_64: '32-avos',
    grand_final: 'Final geral',
  };
  const mapped = map[phase];
  if (mapped) return mapped;
  if (phase.startsWith('group_')) return `Grupo ${phase.replace('group_', '').toUpperCase()}`;
  if (phase.startsWith('round_')) return `Rodada ${phase.replace('round_', '')}`;
  return phase;
}

function MatchCard({ match }: { match: TournamentMatchView }) {
  const isCompleted = match.status === 'completed';
  const isBye = match.isBye || match.status === 'bye';
  const isWalkover = match.status === 'walkover' || match.status === 'double_walkover';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-2.5 text-[12.5px]',
        isCompleted && 'border-border',
        isBye && 'border-dashed opacity-60',
        isWalkover && 'border-amber-500/40 bg-amber-500/5',
        !isCompleted && !isBye && !isWalkover && 'border-border/60',
      )}
    >
      <PlayerSlot
        name={match.player1Name}
        seed={match.seed1}
        tbdLabel={match.tbdPlayer1Label}
        isWinner={isCompleted && match.winnerId === match.player1Id}
      />
      <div className="my-1 border-t border-border/50" />
      <PlayerSlot
        name={match.player2Name}
        seed={match.seed2}
        tbdLabel={match.tbdPlayer2Label}
        isWinner={isCompleted && match.winnerId === match.player2Id}
      />
      {match.score ? (
        <p className="mt-2 text-right text-[11px] font-mono text-muted-foreground">{match.score}</p>
      ) : null}
      {isWalkover ? (
        <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-amber-700 dark:text-amber-400">
          {match.status === 'double_walkover' ? 'WO duplo' : 'Walkover'}
        </p>
      ) : null}
      {match.scheduledFor && !isCompleted ? (
        <p className="mt-2 text-[10.5px] text-muted-foreground">
          {new Date(match.scheduledFor).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      ) : null}
    </div>
  );
}

function PlayerSlot({
  name,
  seed,
  tbdLabel,
  isWinner,
}: {
  name: string | null;
  seed: number | null;
  tbdLabel: string | null;
  isWinner: boolean;
}) {
  if (!name) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="truncate text-[12px] italic">{tbdLabel ?? 'A definir'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {isWinner ? <Crown className="size-3 text-amber-500" /> : null}
      {seed ? (
        <span className="inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded bg-muted px-1 text-[9.5px] font-bold tabular-nums text-muted-foreground">
          {seed}
        </span>
      ) : null}
      <span className={cn('truncate', isWinner && 'font-semibold')}>{name}</span>
    </div>
  );
}

// ─── Entries view ───────────────────────────────────────────────────────

function EntriesView({
  entries,
  tournament,
}: {
  entries: TournamentEntry[] | null;
  tournament: TournamentDetail;
}) {
  if (!entries) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Lista de inscritos não disponível.
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Sem inscritos ainda.
      </p>
    );
  }

  const categoriesById = new Map(tournament.categories.map((c) => [c.id, c.name]));

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-display text-[14px] font-bold">{e.userFullName}</p>
              {e.isWildCard ? (
                <span className="inline-flex h-5 items-center rounded-full bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
                  Wild card
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
              {e.categoryId ? <span>{categoriesById.get(e.categoryId) ?? '—'}</span> : null}
              {e.ratingAtEntry != null ? <span>· rating {e.ratingAtEntry}</span> : null}
            </p>
          </div>
          <EntryStatusBadge status={e.status} />
        </li>
      ))}
    </ul>
  );
}

function EntryStatusBadge({ status }: { status: TournamentEntry['status'] }) {
  if (status === 'seeded') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(142_71%_32%)]">
        <CheckCircle2 className="size-3" />
        Confirmado
      </span>
    );
  }
  if (status === 'pending_approval') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <Loader2 className="size-3" />
        Aguarda aprovação
      </span>
    );
  }
  if (status === 'pending_seeding') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <Trophy className="size-3" />
        Aguarda sorteio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
      <XCircle className="size-3" />
      Withdrawn
    </span>
  );
}

// ─── Status badge ───────────────────────────────────────────────────────

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
