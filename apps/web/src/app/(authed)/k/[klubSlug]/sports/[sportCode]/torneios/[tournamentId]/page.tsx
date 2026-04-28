'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Crown,
  Dices,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  Space,
  TournamentBracket,
  TournamentDetail,
  TournamentEntry,
  TournamentMatchView,
  TournamentResultReportingMode,
  TournamentStatus,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { listKlubSpaces } from '@/lib/api/spaces';
import {
  drawTournament,
  getTournament,
  getTournamentBracket,
  listTournamentEntries,
  scheduleTournament,
  updateReportingMode,
  type ScheduleConfigInput,
} from '@/lib/api/tournaments';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
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

type TabId = 'overview' | 'bracket' | 'entries' | 'operacoes';

export default function TournamentDetailPage() {
  const params = useParams<{ klubSlug: string; sportCode: string; tournamentId: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const tournamentId = params.tournamentId;

  const [tab, setTab] = React.useState<TabId>('overview');
  const [tournament, setTournament] = React.useState<TournamentDetail | null>(null);
  const [bracket, setBracket] = React.useState<TournamentBracket | null>(null);
  const [entries, setEntries] = React.useState<TournamentEntry[] | null>(null);
  const [canManage, setCanManage] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void getMe()
      .then((me) => {
        if (cancelled) return;
        const platform = me.roleAssignments.some((r) => isPlatformLevel(r.role));
        const local = me.roleAssignments.some(
          (r) =>
            (r.role === 'KLUB_ADMIN' ||
              r.role === 'KLUB_ASSISTANT' ||
              r.role === 'SPORT_COMMISSION') &&
            r.scopeKlubId === klub.id,
        );
        setCanManage(platform || local);
      })
      .catch(() => null);
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
  }, [klub, sportCode, tournamentId, reload]);

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
            <TabBar active={tab} onSelect={setTab} canManage={canManage} />
            <div className="pt-2">
              {tab === 'overview' ? <Overview tournament={tournament} /> : null}
              {tab === 'bracket' ? <BracketView bracket={bracket} /> : null}
              {tab === 'entries' ? <EntriesView entries={entries} tournament={tournament} /> : null}
              {tab === 'operacoes' && canManage ? (
                <OperacoesView
                  tournament={tournament}
                  klubId={klub.id}
                  onChanged={() => setReload((n) => n + 1)}
                />
              ) : null}
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

function TabBar({
  active,
  onSelect,
  canManage,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  canManage: boolean;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'bracket', label: 'Chave' },
    { id: 'entries', label: 'Inscritos' },
    ...(canManage ? [{ id: 'operacoes' as TabId, label: 'Operações' }] : []),
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

// ─── Operações tab (PR-K2b) ─────────────────────────────────────────────

function OperacoesView({
  tournament,
  klubId,
  onChanged,
}: {
  tournament: TournamentDetail;
  klubId: string;
  onChanged: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const isDrawn = tournament.status !== 'draft';
  const isFinished = tournament.status === 'finished' || tournament.status === 'cancelled';

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
          <CheckCircle2 className="mr-1 inline size-3.5" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </p>
      ) : null}

      <DrawSection
        tournament={tournament}
        isDrawn={isDrawn}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <ScheduleSection
        tournamentId={tournament.id}
        klubId={klubId}
        isDrawn={isDrawn}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <ReportingModeSection
        tournament={tournament}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />
    </div>
  );
}

function DrawSection({
  tournament,
  isDrawn,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  isDrawn: boolean;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const disabled = isFinished || submitting;

  async function handleDraw() {
    if (disabled) return;
    if (
      !window.confirm(
        `Sortear chave de "${tournament.name}"?\n\nMatches serão gerados a partir das ${tournament.entryCount} inscrições aprovadas. Após sortear, mover players entre categorias deixa de ser trivial.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await drawTournament(tournament.id);
      onSuccess('Chave sorteada — veja a aba "Chave".');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao sortear.'));
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Dices className="size-4 text-muted-foreground" />
        <h3 className="font-display text-[14px] font-bold">Sortear chave</h3>
        {isDrawn ? (
          <span className="inline-flex h-5 items-center rounded-full bg-[hsl(142_71%_32%/0.12)] px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[hsl(142_71%_32%)]">
            Já sorteada
          </span>
        ) : null}
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Gera matches do bracket aplicando seeding por rating. Pra knockout/double-elim, players são
        distribuídos com bye automático se número não for potência de 2. Pra round-robin, todos
        contra todos.
      </p>
      <div>
        <button
          type="button"
          onClick={() => void handleDraw()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Dices className="size-3.5" />
          )}
          {isDrawn ? 'Re-sortear' : 'Sortear'}
        </button>
      </div>
    </section>
  );
}

function ScheduleSection({
  tournamentId,
  klubId,
  isDrawn,
  isFinished,
  onSuccess,
  onError,
}: {
  tournamentId: string;
  klubId: string;
  isDrawn: boolean;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const disabled = isFinished || !isDrawn;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="size-4 text-muted-foreground" />
        <h3 className="font-display text-[14px] font-bold">Distribuir agenda</h3>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Aloca matches em quadras+horários respeitando duração da partida, intervalo entre matches e
        descanso mínimo de cada player. Pré-requisito: chave já sorteada.
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-[13px] font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Settings2 className="size-3.5" />
          Configurar agenda
        </button>
      </div>
      {open ? (
        <ScheduleModal
          tournamentId={tournamentId}
          klubId={klubId}
          onClose={() => setOpen(false)}
          onSuccess={(msg) => {
            setOpen(false);
            onSuccess(msg);
          }}
          onError={onError}
        />
      ) : null}
    </section>
  );
}

function ReportingModeSection({
  tournament,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [mode, setMode] = React.useState<TournamentResultReportingMode>(
    tournament.resultReportingMode,
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setMode(tournament.resultReportingMode);
  }, [tournament.resultReportingMode]);

  const dirty = mode !== tournament.resultReportingMode;
  const disabled = isFinished || submitting || !dirty;

  async function handleSave() {
    if (disabled) return;
    setSubmitting(true);
    try {
      await updateReportingMode(tournament.id, mode);
      onSuccess(
        mode === 'committee_only'
          ? 'Modo atualizado: comissão reporta resultados.'
          : 'Modo atualizado: player reporta + outro confirma.',
      );
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao atualizar modo.'));
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-muted-foreground" />
        <h3 className="font-display text-[14px] font-bold">Modo de reportagem</h3>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Define quem pode reportar resultado de match. <strong>Comissão reporta</strong> é mais
        controlado. <strong>Player + confirma</strong> reduz fricção mas exige confirmação do rival.
      </p>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as TournamentResultReportingMode)}
        disabled={isFinished || submitting}
        className={inputCls}
      >
        <option value="committee_only">Comissão reporta</option>
        <option value="player_with_confirm">Player reporta + outro confirma</option>
      </select>
      <div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Salvar
        </button>
      </div>
    </section>
  );
}

// ─── Schedule modal ─────────────────────────────────────────────────────

function ScheduleModal({
  tournamentId,
  klubId,
  onClose,
  onSuccess,
  onError,
}: {
  tournamentId: string;
  klubId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [spaces, setSpaces] = React.useState<Space[] | null>(null);
  const [dates, setDates] = React.useState<string[]>([formatToday()]);
  const [startHour, setStartHour] = React.useState(8);
  const [endHour, setEndHour] = React.useState(22);
  const [matchDurationMinutes, setMatchDurationMinutes] = React.useState(60);
  const [breakBetweenMatchesMinutes, setBreakBetweenMatchesMinutes] = React.useState(15);
  const [restRuleMinutes, setRestRuleMinutes] = React.useState(60);
  const [spaceIds, setSpaceIds] = React.useState<string[]>([]);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    listKlubSpaces(klubId)
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((s) => s.status === 'active');
        setSpaces(active);
        // Pre-select all active spaces by default
        setSpaceIds(active.map((s) => s.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) setBootError(toErrorMessage(err, 'Erro ao carregar quadras.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klubId]);

  function addDate() {
    setDates((prev) => [...prev, formatToday()]);
  }
  function updateDate(idx: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === idx ? value : d)));
  }
  function removeDate(idx: number) {
    setDates((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleSpace(id: string) {
    setSpaceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (dates.length === 0) {
      setLocalError('Adicione pelo menos uma data.');
      return;
    }
    if (endHour <= startHour) {
      setLocalError('Hora final deve ser maior que inicial.');
      return;
    }
    if (spaceIds.length === 0) {
      setLocalError('Escolha pelo menos uma quadra.');
      return;
    }
    setSubmitting(true);
    try {
      const config: ScheduleConfigInput = {
        availableDates: dates,
        startHour,
        endHour,
        matchDurationMinutes,
        breakBetweenMatchesMinutes,
        restRuleMinutes,
        spaceIds,
      };
      await scheduleTournament(tournamentId, config);
      onSuccess('Agenda distribuída — matches alocados em quadras+horários.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao agendar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Distribuir agenda</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {bootError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
            {bootError}
          </p>
        ) : null}
        {localError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
            {localError}
          </p>
        ) : null}

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Datas disponíveis
          </p>
          <ul className="space-y-2">
            {dates.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="date"
                  value={d}
                  onChange={(e) => updateDate(i, e.target.value)}
                  className={cn(inputCls, 'flex-1')}
                />
                {dates.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    aria-label="Remover data"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addDate}
            className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border bg-background px-2.5 text-[12px] font-medium hover:bg-muted"
          >
            <Plus className="size-3" />
            Adicionar data
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Início (h)
            </p>
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Fim (h)
            </p>
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Duração match (min)
            </p>
            <input
              type="number"
              min={30}
              max={360}
              step={5}
              value={matchDurationMinutes}
              onChange={(e) => setMatchDurationMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Break entre matches
            </p>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={breakBetweenMatchesMinutes}
              onChange={(e) => setBreakBetweenMatchesMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Descanso mínimo do player (min)
            </p>
            <input
              type="number"
              min={0}
              max={360}
              step={15}
              value={restRuleMinutes}
              onChange={(e) => setRestRuleMinutes(Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tempo mínimo entre 2 matches do mesmo player.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Quadras
          </p>
          {!spaces ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : spaces.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Nenhuma quadra ativa no Klub. Adicione em Configurar Klub → Quadras.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {spaces.map((s) => {
                const checked = spaceIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-[12.5px] transition-colors',
                        checked ? 'border-primary bg-primary/5' : 'border-border bg-background',
                      )}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleSpace(s.id)} />
                      <span className="flex-1">{s.name}</span>
                      {s.indoor ? (
                        <span className="text-[10.5px] uppercase text-muted-foreground">
                          indoor
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CalendarRange className="size-3.5" />
            )}
            Distribuir
          </button>
        </div>
      </div>
    </div>
  );
}

function formatToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const inputCls =
  'w-full rounded-[10px] border border-input bg-background px-3 py-2.25 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
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
