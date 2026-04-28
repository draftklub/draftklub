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
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  PreviewMatchRevertResult,
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
  applyDoubleWalkover,
  applyWalkover,
  approveTournamentEntry,
  cancelTournament,
  confirmTournamentMatch,
  drawTournament,
  editTournamentMatch,
  getTournament,
  getTournamentBracket,
  listTournamentEntries,
  moveTournamentEntryCategory,
  previewMatchRevert,
  registerTournamentEntry,
  reportTournamentMatch,
  revertTournamentMatch,
  scheduleTournament,
  updateReportingMode,
  updateTournament,
  withdrawMyTournamentEntry,
  type ScheduleConfigInput,
  type UpdateTournamentInput,
} from '@/lib/api/tournaments';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
import { validateMatchScore } from '@/lib/sport-validation';
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
  const [meId, setMeId] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void getMe()
      .then((me) => {
        if (cancelled) return;
        setMeId(me.id);
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
              {tab === 'bracket' ? (
                <BracketView
                  bracket={bracket}
                  tournament={tournament}
                  meId={meId}
                  canManage={canManage}
                  onChanged={() => setReload((n) => n + 1)}
                />
              ) : null}
              {tab === 'entries' ? (
                <EntriesView
                  entries={entries}
                  tournament={tournament}
                  meId={meId}
                  canManage={canManage}
                  onChanged={() => setReload((n) => n + 1)}
                />
              ) : null}
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

      <EditTournamentSection
        tournament={tournament}
        klubId={klubId}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <CancelTournamentSection
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

function EditTournamentSection({
  tournament,
  klubId,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  klubId: string;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isCancelled = tournament.status === 'cancelled';
  const disabled = isFinished || isCancelled;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-muted-foreground" />
        <h3 className="font-display text-[14px] font-bold">Editar dados do torneio</h3>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Edita nome, descrição, datas, modo de aprovação. Format, ranking e categorias não são
        editáveis pós-create — exigiriam recriar bracket. Bloqueado se torneio finalizado/cancelado.
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-[13px] font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Pencil className="size-3.5" />
          Editar…
        </button>
      </div>
      {open ? (
        <EditTournamentModal
          tournament={tournament}
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

function EditTournamentModal({
  tournament,
  klubId,
  onClose,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  klubId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const sportCode = useSportCodeFromTournament(tournament);
  const [name, setName] = React.useState(tournament.name);
  const [description, setDescription] = React.useState(tournament.description ?? '');
  const [registrationApproval, setRegistrationApproval] = React.useState(
    tournament.registrationApproval,
  );
  const [registrationOpensAt, setRegistrationOpensAt] = React.useState(
    isoToLocal(tournament.registrationOpensAt),
  );
  const [registrationClosesAt, setRegistrationClosesAt] = React.useState(
    isoToLocal(tournament.registrationClosesAt),
  );
  const [drawDate, setDrawDate] = React.useState(isoToLocal(tournament.drawDate));
  const [prequalifierStartDate, setPrequalifierStartDate] = React.useState(
    tournament.prequalifierStartDate ? isoToLocal(tournament.prequalifierStartDate) : '',
  );
  const [prequalifierEndDate, setPrequalifierEndDate] = React.useState(
    tournament.prequalifierEndDate ? isoToLocal(tournament.prequalifierEndDate) : '',
  );
  const [mainStartDate, setMainStartDate] = React.useState(isoToLocal(tournament.mainStartDate));
  const [mainEndDate, setMainEndDate] = React.useState(
    tournament.mainEndDate ? isoToLocal(tournament.mainEndDate) : '',
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (name.trim().length < 2) {
      setLocalError('Nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const patch: UpdateTournamentInput = {};
      // Inclui só campos que mudaram pra reduzir surface da PATCH.
      if (name.trim() !== tournament.name) patch.name = name.trim();
      if ((description.trim() || null) !== (tournament.description ?? null)) {
        patch.description = description.trim() || null;
      }
      if (registrationApproval !== tournament.registrationApproval) {
        patch.registrationApproval = registrationApproval;
      }
      if (localToIso(registrationOpensAt) !== tournament.registrationOpensAt) {
        patch.registrationOpensAt = localToIso(registrationOpensAt);
      }
      if (localToIso(registrationClosesAt) !== tournament.registrationClosesAt) {
        patch.registrationClosesAt = localToIso(registrationClosesAt);
      }
      if (localToIso(drawDate) !== tournament.drawDate) {
        patch.drawDate = localToIso(drawDate);
      }
      if (tournament.hasPrequalifiers) {
        const oldPreqStart = tournament.prequalifierStartDate ?? null;
        const newPreqStart = prequalifierStartDate ? localToIso(prequalifierStartDate) : null;
        if (newPreqStart !== oldPreqStart) patch.prequalifierStartDate = newPreqStart;
        const oldPreqEnd = tournament.prequalifierEndDate ?? null;
        const newPreqEnd = prequalifierEndDate ? localToIso(prequalifierEndDate) : null;
        if (newPreqEnd !== oldPreqEnd) patch.prequalifierEndDate = newPreqEnd;
      }
      if (localToIso(mainStartDate) !== tournament.mainStartDate) {
        patch.mainStartDate = localToIso(mainStartDate);
      }
      const oldMainEnd = tournament.mainEndDate ?? null;
      const newMainEnd = mainEndDate ? localToIso(mainEndDate) : null;
      if (newMainEnd !== oldMainEnd) patch.mainEndDate = newMainEnd;

      if (Object.keys(patch).length === 0) {
        setLocalError('Nenhum campo alterado.');
        setSubmitting(false);
        return;
      }

      await updateTournament(klubId, sportCode, tournament.id, patch);
      onSuccess('Torneio atualizado.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao atualizar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Editar torneio</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {localError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {localError}
          </p>
        ) : null}

        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Nome
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Descrição
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Aprovação de inscrição
          </p>
          <select
            value={registrationApproval}
            onChange={(e) => setRegistrationApproval(e.target.value as 'auto' | 'committee')}
            className={inputCls}
          >
            <option value="auto">Automática</option>
            <option value="committee">Comissão aprova</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DateField
            label="Inscrições abrem"
            value={registrationOpensAt}
            onChange={setRegistrationOpensAt}
          />
          <DateField
            label="Inscrições fecham"
            value={registrationClosesAt}
            onChange={setRegistrationClosesAt}
          />
          <DateField label="Sorteio" value={drawDate} onChange={setDrawDate} />
          <DateField
            label="Início fase principal"
            value={mainStartDate}
            onChange={setMainStartDate}
          />
          <DateField
            label="Fim fase principal (opcional)"
            value={mainEndDate}
            onChange={setMainEndDate}
          />
        </div>

        {tournament.hasPrequalifiers ? (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 sm:grid-cols-2">
            <DateField
              label="Pré-qualificatória — início"
              value={prequalifierStartDate}
              onChange={setPrequalifierStartDate}
            />
            <DateField
              label="Pré-qualificatória — fim"
              value={prequalifierEndDate}
              onChange={setPrequalifierEndDate}
            />
          </div>
        ) : null}

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
              <Save className="size-3.5" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

/** Converte ISO 8601 UTC pra "YYYY-MM-DDTHH:mm" local pra <input type="datetime-local">. */
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  return new Date(local).toISOString();
}

function useSportCodeFromTournament(_tournament: TournamentDetail): string {
  // sportCode vive na URL; lemos via useParams. Wrapper hook pra evitar
  // ter que passar sportCode por props pelas seções inteiras.
  const params = useParams<{ sportCode: string }>();
  return params.sportCode;
}

function CancelTournamentSection({
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
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const isCancelled = tournament.status === 'cancelled';
  const disabled = isFinished || isCancelled || submitting;

  async function handleCancel() {
    if (disabled) return;
    if (
      !window.confirm(
        `Cancelar "${tournament.name}"?\n\nMatches que ainda não rolaram são marcados como cancelled. Inscritos perdem acesso. Operação reversível só por SQL/admin direto no banco.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await cancelTournament(tournament.id, { reason: reason.trim() || undefined });
      onSuccess('Torneio cancelado.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao cancelar.'));
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="size-4 text-destructive" />
        <h3 className="font-display text-[14px] font-bold text-destructive">Cancelar torneio</h3>
        {isCancelled ? (
          <span className="inline-flex h-5 items-center rounded-full bg-destructive/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-destructive">
            Já cancelado
          </span>
        ) : null}
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Cancela o torneio inteiro. Status vira 'cancelled', matches futuros não rolam, players
        recebem notificação. Use só pra abortar evento que não vai acontecer mais.
      </p>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Motivo (opcional)
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ex: chuva persistente; mudança de calendário; etc."
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => void handleCancel()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-destructive bg-destructive/10 px-4 text-[13px] font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <XCircle className="size-3.5" />
          )}
          Cancelar torneio
        </button>
      </div>
    </section>
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

function BracketView({
  bracket,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  bracket: TournamentBracket | null;
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
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

      <BracketByPhases
        matches={activeCategory.matches}
        tournament={tournament}
        meId={meId}
        canManage={canManage}
        onChanged={onChanged}
      />
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
function BracketByPhases({
  matches,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  matches: TournamentMatchView[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
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

  const sectionProps = { tournament, meId, canManage, onChanged };
  // Grid layout só pra formats com bracket-geometry. Round-robin não tem
  // hierarquia de slots; mantém flex empilhado.
  const useGrid =
    tournament.format === 'knockout' ||
    tournament.format === 'double_elimination' ||
    tournament.format === 'groups_knockout';

  return (
    <div className="space-y-5">
      {hasGroups ? (
        <BracketSection
          title="Fase de grupos"
          phases={byPhase.groups}
          layout="flex"
          {...sectionProps}
        />
      ) : null}
      <BracketSection
        title={hasLosers ? 'Chave principal (winners)' : null}
        phases={byPhase.winners}
        layout={useGrid ? 'grid' : 'flex'}
        {...sectionProps}
      />
      {hasLosers ? (
        <BracketSection
          title="Repescagem (losers)"
          phases={byPhase.losers}
          layout="grid"
          {...sectionProps}
        />
      ) : null}
      {byPhase.grandFinal.length > 0 ? (
        <BracketSection
          title="Final"
          phases={[{ phase: 'grand_final', matches: byPhase.grandFinal }]}
          layout="flex"
          {...sectionProps}
        />
      ) : null}
    </div>
  );
}

function BracketSection({
  title,
  phases,
  tournament,
  meId,
  canManage,
  onChanged,
  layout = 'flex',
}: {
  title: string | null;
  phases: { phase: string; matches: TournamentMatchView[] }[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
  /**
   * `'flex'` empilha matches verticalmente por phase (round-robin/groups).
   * `'grid'` usa CSS Grid posicionando matches por slotTop/slotBottom (knockout/
   * losers): matches em rounds posteriores ficam visualmente entre seus
   * predecessores, replicando layout de bracket clássico.
   */
  layout?: 'flex' | 'grid';
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
        {layout === 'grid' ? (
          <BracketGrid
            phases={phases}
            tournament={tournament}
            meId={meId}
            canManage={canManage}
            onChanged={onChanged}
          />
        ) : (
          <div className="flex min-w-max gap-3">
            {phases.map((p) => (
              <div key={p.phase} className="w-60 shrink-0 space-y-2">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  {labelPhase(p.phase)}
                </p>
                {p.matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    tournament={tournament}
                    meId={meId}
                    canManage={canManage}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BracketGrid({
  phases,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  phases: { phase: string; matches: TournamentMatchView[] }[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  // Total de "slots" — usa o maior slotBottom em todas as phases pra
  // dimensionar o grid. Min 1 pra evitar grid degenerado.
  const maxSlot = Math.max(1, ...phases.flatMap((p) => p.matches.map((m) => m.slotBottom)));
  // Ordena phases por round (estimativa: se phase é numérica, usa; senão
  // usa ordem do array que já vem ordenada).
  const phaseToCol = new Map(phases.map((p, i) => [p.phase, i + 1]));

  return (
    <div className="space-y-2">
      {/* Headers */}
      <div
        className="grid min-w-max gap-x-3"
        style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(220px, 1fr))` }}
      >
        {phases.map((p) => (
          <p
            key={p.phase}
            className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground"
          >
            {labelPhase(p.phase)}
          </p>
        ))}
      </div>

      {/* Grid bracket. Cada match span de slotTop a slotBottom (1-indexed
       * inclusive). Cards centralizados verticalmente no span pra dar
       * efeito de bracket onde rounds posteriores ficam entre os children. */}
      <div
        className="grid min-w-max gap-x-3 gap-y-1"
        style={{
          gridTemplateColumns: `repeat(${phases.length}, minmax(220px, 1fr))`,
          gridTemplateRows: `repeat(${maxSlot + 1}, minmax(40px, auto))`,
        }}
      >
        {phases.flatMap((p) =>
          p.matches.map((m) => {
            const col = phaseToCol.get(p.phase) ?? 1;
            // slotBottom é inclusive; grid-row end é exclusive, então +2
            const rowStart = m.slotTop + 1;
            const rowEnd = m.slotBottom + 2;
            return (
              <div
                key={m.id}
                className="flex flex-col justify-center"
                style={{
                  gridColumn: col,
                  gridRow: `${rowStart} / ${rowEnd}`,
                }}
              >
                <MatchCard
                  match={m}
                  tournament={tournament}
                  meId={meId}
                  canManage={canManage}
                  onChanged={onChanged}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
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

function MatchCard({
  match,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isCompleted = match.status === 'completed';
  const isAwaitingConfirm = match.status === 'awaiting_confirmation';
  const isPending = match.status === 'pending';
  const isBye = match.isBye || match.status === 'bye';
  const isWalkover = match.status === 'walkover' || match.status === 'double_walkover';

  const isPlayer = meId != null && (match.player1Id === meId || match.player2Id === meId);
  const playersKnown = match.player1Id != null && match.player2Id != null;
  // Clickable se há ação possível: pendente com players, awaiting confirm,
  // ou completed-and-canManage (pra eventual edit/walkover futuros).
  const actionable =
    !isBye &&
    ((isPending &&
      playersKnown &&
      (canManage || (isPlayer && tournament.resultReportingMode === 'player_with_confirm'))) ||
      (isAwaitingConfirm && (canManage || isPlayer)) ||
      (isCompleted && canManage));

  return (
    <>
      <button
        type="button"
        onClick={actionable ? () => setOpen(true) : undefined}
        disabled={!actionable}
        className={cn(
          'block w-full rounded-lg border bg-card p-2.5 text-left text-[12.5px] transition-colors',
          isCompleted && 'border-border',
          isBye && 'border-dashed opacity-60',
          isWalkover && 'border-amber-500/40 bg-amber-500/5',
          isAwaitingConfirm && 'border-amber-500/40 bg-amber-500/5',
          !isCompleted && !isBye && !isWalkover && !isAwaitingConfirm && 'border-border/60',
          actionable && 'cursor-pointer hover:border-primary/40 hover:bg-muted/30',
          !actionable && 'cursor-default',
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
          <p className="mt-2 text-right font-mono text-[11px] text-muted-foreground">
            {match.score}
          </p>
        ) : null}
        {isWalkover ? (
          <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-amber-700 dark:text-amber-400">
            {match.status === 'double_walkover' ? 'WO duplo' : 'Walkover'}
          </p>
        ) : null}
        {isAwaitingConfirm ? (
          <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-amber-700 dark:text-amber-400">
            Aguarda confirmação
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
      </button>
      {open ? (
        <MatchActionModal
          match={match}
          tournament={tournament}
          isPlayer={isPlayer}
          canManage={canManage}
          onClose={() => setOpen(false)}
          onChanged={() => {
            setOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </>
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

// ─── Match action modal (PR-K3b) ────────────────────────────────────────

function MatchActionModal({
  match,
  tournament,
  isPlayer,
  canManage,
  onClose,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  isPlayer: boolean;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isCompleted = match.status === 'completed';
  const isAwaitingConfirm = match.status === 'awaiting_confirmation';
  const isPending = match.status === 'pending';

  const canReport =
    isPending &&
    match.player1Id != null &&
    match.player2Id != null &&
    (canManage || (isPlayer && tournament.resultReportingMode === 'player_with_confirm'));
  const canConfirm = isAwaitingConfirm && (canManage || isPlayer);
  // Edit completed: só committee (vem em K4 com mais features tipo walkover).
  const canEditCompleted = isCompleted && canManage;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {isCompleted
              ? 'Resultado registrado'
              : isAwaitingConfirm
                ? 'Confirmar resultado'
                : 'Reportar resultado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <MatchSummary match={match} />

        {canReport ? (
          <ReportForm
            match={match}
            tournament={tournament}
            canManage={canManage}
            onChanged={onChanged}
          />
        ) : canConfirm ? (
          <ConfirmForm match={match} tournament={tournament} onChanged={onChanged} />
        ) : canEditCompleted ? (
          <EditForm match={match} tournament={tournament} onChanged={onChanged} />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-[12.5px] text-muted-foreground">
            {isCompleted ? 'Match já encerrado.' : 'Você não pode reportar/confirmar esse match.'}
          </p>
        )}

        {/* Sprint K PR-K4: walkover (pending) e revert (completed) — committee/admin only */}
        {canManage && isPending && match.player1Id && match.player2Id ? (
          <WalkoverActions match={match} tournament={tournament} onChanged={onChanged} />
        ) : null}
        {canManage && isCompleted ? <RevertSection match={match} onChanged={onChanged} /> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-[12.5px] font-medium hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchSummary({ match }: { match: TournamentMatchView }) {
  const winner =
    match.winnerId === match.player1Id
      ? match.player1Name
      : match.winnerId === match.player2Id
        ? match.player2Name
        : null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-[12.5px]">
      <div className="flex items-center gap-2">
        <span className={cn(winner === match.player1Name && 'font-semibold')}>
          {match.player1Name ?? match.tbdPlayer1Label ?? 'A definir'}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className={cn(winner === match.player2Name && 'font-semibold')}>
          {match.player2Name ?? match.tbdPlayer2Label ?? 'A definir'}
        </span>
      </div>
      {match.score ? (
        <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">{match.score}</p>
      ) : null}
      {match.scheduledFor ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
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

function ReportForm({
  match,
  tournament,
  canManage,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [winnerId, setWinnerId] = React.useState<string>('');
  const [score, setScore] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sportCodeForValidation = useSportCodeFromTournament(tournament);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!winnerId) {
      setError('Selecione o vencedor.');
      return;
    }
    if (!match.player1Id || !match.player2Id) {
      setError('Match não tem 2 players definidos.');
      return;
    }
    const validation = validateMatchScore(sportCodeForValidation, {
      winnerId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      score: score.trim() || undefined,
    });
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'Score inválido.');
      return;
    }
    setSubmitting(true);
    try {
      await reportTournamentMatch(tournament.id, match.id, {
        winnerId,
        score: score.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao reportar.'));
      setSubmitting(false);
    }
  }

  // Mensagem contextual sobre fluxo de confirmação
  const willGoStraight = canManage || tournament.resultReportingMode === 'committee_only';

  return (
    <div className="space-y-2.5">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </p>
      ) : null}
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Vencedor
        </p>
        <div className="space-y-1.5">
          {(() => {
            const p1 = match.player1Id;
            const p2 = match.player2Id;
            return (
              <>
                {p1 ? (
                  <WinnerOption
                    checked={winnerId === p1}
                    onSelect={() => setWinnerId(p1)}
                    name={match.player1Name ?? '—'}
                  />
                ) : null}
                {p2 ? (
                  <WinnerOption
                    checked={winnerId === p2}
                    onSelect={() => setWinnerId(p2)}
                    name={match.player2Name ?? '—'}
                  />
                ) : null}
              </>
            );
          })()}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Score (opcional)
        </p>
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="6-3 6-2"
          maxLength={50}
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Formato livre. Ex: <code>6-3 6-2</code> ou <code>6-4 3-6 7-5</code>.
        </p>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Notas (opcional)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className={inputCls}
        />
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        {willGoStraight
          ? 'Resultado vai direto pra completed; rating recalculado e bracket avança.'
          : 'Após reportar, o outro player precisa confirmar antes de virar oficial.'}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Reportar
        </button>
      </div>
    </div>
  );
}

function ConfirmForm({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirmTournamentMatch(tournament.id, match.id);
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao confirmar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </p>
      ) : null}
      <p className="text-[12.5px] text-muted-foreground">
        Resultado já reportado. Ao confirmar, vira oficial: rating é recalculado e bracket avança o
        vencedor pro próximo match.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Confirmar
        </button>
      </div>
    </div>
  );
}

function EditForm({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [winnerId, setWinnerId] = React.useState<string>(match.winnerId ?? '');
  const [score, setScore] = React.useState(match.score ?? '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sportCodeForValidation = useSportCodeFromTournament(tournament);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!winnerId) {
      setError('Selecione o vencedor.');
      return;
    }
    if (!match.player1Id || !match.player2Id) {
      setError('Match não tem 2 players definidos.');
      return;
    }
    const validation = validateMatchScore(sportCodeForValidation, {
      winnerId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      score: score.trim() || undefined,
    });
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'Score inválido.');
      return;
    }
    setSubmitting(true);
    try {
      await editTournamentMatch(tournament.id, match.id, {
        winnerId,
        score: score.trim() || undefined,
      });
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao editar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </p>
      ) : null}
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[12px] text-amber-700 dark:text-amber-400">
        <AlertCircle className="mr-1 inline size-3.5" />
        Editar resultado já registrado recalcula rating e pode afetar matches posteriores. Use só em
        correção de erro óbvio.
      </p>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Vencedor
        </p>
        <div className="space-y-1.5">
          {(() => {
            const p1 = match.player1Id;
            const p2 = match.player2Id;
            return (
              <>
                {p1 ? (
                  <WinnerOption
                    checked={winnerId === p1}
                    onSelect={() => setWinnerId(p1)}
                    name={match.player1Name ?? '—'}
                  />
                ) : null}
                {p2 ? (
                  <WinnerOption
                    checked={winnerId === p2}
                    onSelect={() => setWinnerId(p2)}
                    name={match.player2Name ?? '—'}
                  />
                ) : null}
              </>
            );
          })()}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Score
        </p>
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="6-3 6-2"
          maxLength={50}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
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
    </div>
  );
}

function WinnerOption({
  checked,
  onSelect,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-[13px] transition-colors',
        checked
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-primary bg-primary' : 'border-input bg-background',
        )}
      >
        {checked ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
      </span>
      <span className="truncate font-medium">{name}</span>
    </button>
  );
}

// ─── Walkover + Revert (PR-K4) ──────────────────────────────────────────

function WalkoverActions({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = React.useState<'p1' | 'p2' | 'double' | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');

  async function handleApply(kind: 'p1' | 'p2' | 'double') {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (kind === 'double') {
        await applyDoubleWalkover(tournament.id, match.id, {
          notes: notes.trim() || undefined,
        });
      } else {
        const winnerId = kind === 'p1' ? match.player1Id : match.player2Id;
        if (!winnerId) {
          setError('Player não definido pra aplicar walkover.');
          setSubmitting(false);
          return;
        }
        await applyWalkover(tournament.id, match.id, {
          winnerId,
          notes: notes.trim() || undefined,
        });
      }
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao aplicar walkover.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
        Walkover (admin)
      </p>
      <p className="text-[12px] text-muted-foreground">
        Use quando jogador desistir/não comparecer. Walkover simples avança o outro; double walkover
        finaliza sem vencedor.
      </p>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <div className="space-y-2">
          <p className="text-[12.5px]">
            <strong>Confirmar:</strong>{' '}
            {confirming === 'double'
              ? `Walkover duplo (ambos players desistem).`
              : `WO — ${confirming === 'p1' ? match.player1Name : match.player2Name} avança.`}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Notas (opcional, ex: motivo)"
            className={inputCls}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleApply(confirming)}
              disabled={submitting}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-amber-600 px-3 text-[12px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3 animate-spin" /> : null}
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(null);
                setNotes('');
              }}
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-[12px] font-medium hover:bg-muted"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirming('p1')}
            className="inline-flex h-8 items-center rounded-md border border-amber-500/30 bg-background px-2.5 text-[11.5px] font-semibold hover:bg-amber-500/10"
          >
            WO: {match.player1Name} avança
          </button>
          <button
            type="button"
            onClick={() => setConfirming('p2')}
            className="inline-flex h-8 items-center rounded-md border border-amber-500/30 bg-background px-2.5 text-[11.5px] font-semibold hover:bg-amber-500/10"
          >
            WO: {match.player2Name} avança
          </button>
          <button
            type="button"
            onClick={() => setConfirming('double')}
            className="inline-flex h-8 items-center rounded-md border border-destructive/30 bg-background px-2.5 text-[11.5px] font-semibold text-destructive hover:bg-destructive/10"
          >
            WO duplo
          </button>
        </div>
      )}
    </div>
  );
}

function RevertSection({
  match,
  onChanged,
}: {
  match: TournamentMatchView;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-destructive">
        Reverter resultado (admin)
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Desfaz o resultado: rating dos players é revertido, próximo match volta pra "scheduled" ou
        "TBD slot". Use só em correção de erro.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex h-9 items-center gap-1 rounded-md border border-destructive bg-background px-3 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
      >
        Reverter…
      </button>
      {open ? (
        <RevertModal
          matchId={match.id}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function RevertModal({
  matchId,
  onClose,
  onSuccess,
}: {
  matchId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [preview, setPreview] = React.useState<PreviewMatchRevertResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    previewMatchRevert(matchId)
      .then((row) => {
        if (!cancelled) setPreview(row);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(toErrorMessage(err, 'Erro ao carregar preview.'));
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await revertTournamentMatch(matchId, { reason: reason.trim() || undefined });
      onSuccess();
    } catch (err: unknown) {
      setSubmitError(toErrorMessage(err, 'Erro ao reverter.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Reverter resultado</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
            {loadError}
          </p>
        ) : !preview ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <RevertPreview preview={preview} />
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                Motivo (opcional, fica em audit trail)
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ex: score reportado errado por um dos players"
                className={inputCls}
              />
            </div>
            {submitError ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
                <AlertCircle className="mr-1 inline size-3.5" />
                {submitError}
              </p>
            ) : null}
          </>
        )}

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
            onClick={() => void handleConfirm()}
            disabled={submitting || !preview}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Reverter
          </button>
        </div>
      </div>
    </div>
  );
}

const REVERT_WARNING_LABELS: Record<string, string> = {
  prequalifier_dual_path_warning:
    'Match de prequalifier — revert pode reabrir caminhos de classificação.',
  cascade_depth_exceeded_1_level:
    'Cascata > 1 nível: matches subsequentes já completed também são afetados.',
};

function RevertPreview({ preview }: { preview: PreviewMatchRevertResult }) {
  const { affectedMatches, ratingDeltas, warnings } = preview.cascade;
  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px]">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-destructive">
        Preview do impacto
      </p>
      <div>
        <p className="font-semibold">Matches afetados ({affectedMatches.length})</p>
        <ul className="mt-1 space-y-0.5 text-[11.5px] text-muted-foreground">
          {affectedMatches.map((m) => (
            <li key={m.id}>
              · {m.phase} #{m.bracketPosition}: {m.status} → {m.willRevertTo}
            </li>
          ))}
        </ul>
      </div>
      {ratingDeltas.length > 0 ? (
        <div>
          <p className="font-semibold">Ratings revertidos</p>
          <ul className="mt-1 space-y-0.5 text-[11.5px] text-muted-foreground">
            {ratingDeltas.map((d) => (
              <li key={d.userId}>
                · player {d.userId.slice(0, 8)}…: {d.ratingAfter} →{' '}
                <strong className="text-foreground">{d.ratingBefore}</strong> (
                {d.toRevert > 0 ? '+' : ''}
                {d.toRevert})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
            Avisos
          </p>
          <ul className="mt-1 space-y-0.5 text-[11.5px] text-muted-foreground">
            {warnings.map((w) => (
              <li key={w}>· {REVERT_WARNING_LABELS[w] ?? w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── Entries view ───────────────────────────────────────────────────────

function EntriesView({
  entries,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  entries: TournamentEntry[] | null;
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  if (!entries) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        Lista de inscritos não disponível.
      </p>
    );
  }

  const categoriesById = new Map(tournament.categories.map((c) => [c.id, c.name]));
  const myEntry =
    meId != null ? entries.find((e) => e.userId === meId && e.status !== 'withdrawn') : undefined;

  return (
    <div className="space-y-3">
      {actionMessage ? (
        <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
          <CheckCircle2 className="mr-1 inline size-3.5" />
          {actionMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {actionError}
        </p>
      ) : null}

      <RegistrationCTA
        tournament={tournament}
        myEntry={myEntry}
        meId={meId}
        onSuccess={(msg) => {
          setActionMessage(msg);
          setActionError(null);
          onChanged();
        }}
        onError={(msg) => {
          setActionError(msg);
          setActionMessage(null);
        }}
      />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
          Sem inscritos ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <EntryRow
                entry={e}
                tournament={tournament}
                categoriesById={categoriesById}
                canManage={canManage}
                onSuccess={(msg) => {
                  setActionMessage(msg);
                  setActionError(null);
                  onChanged();
                }}
                onError={(msg) => {
                  setActionError(msg);
                  setActionMessage(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RegistrationCTA({
  tournament,
  myEntry,
  meId,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  myEntry: TournamentEntry | undefined;
  meId: string | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  if (!meId) return null;

  const now = Date.now();
  const opens = Date.parse(tournament.registrationOpensAt);
  const closes = Date.parse(tournament.registrationClosesAt);
  const windowOpen = now >= opens && now <= closes;
  const isFinished = tournament.status === 'finished' || tournament.status === 'cancelled';
  const isDrawn = tournament.status !== 'draft';

  async function handleRegister() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await registerTournamentEntry(tournament.id);
      onSuccess(
        tournament.registrationApproval === 'committee'
          ? 'Inscrição enviada — aguarda aprovação da comissão.'
          : 'Inscrição confirmada.',
      );
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao se inscrever.'));
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (submitting) return;
    if (
      !window.confirm(
        `Cancelar sua inscrição em "${tournament.name}"?\n\nApós cancelar, só dá pra se reinscrever se a janela ainda estiver aberta e a chave não foi sorteada.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await withdrawMyTournamentEntry(tournament.id);
      onSuccess('Inscrição cancelada.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao cancelar.'));
      setSubmitting(false);
    }
  }

  if (myEntry) {
    const canWithdraw = !isFinished && !isDrawn;
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3.5">
        <div className="flex items-center gap-2 text-[12.5px]">
          <CheckCircle2 className="size-4 text-[hsl(142_71%_32%)]" />
          <span>
            <strong>Você está inscrito.</strong>{' '}
            {myEntry.status === 'pending_approval'
              ? 'Aguardando aprovação da comissão.'
              : myEntry.status === 'pending_seeding'
                ? 'Aguardando sorteio.'
                : 'Já está na chave.'}
          </span>
        </div>
        {canWithdraw ? (
          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <XCircle className="size-3" />
            )}
            Cancelar inscrição
          </button>
        ) : null}
      </section>
    );
  }

  if (isFinished) return null;
  if (isDrawn) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-[12.5px] text-muted-foreground">
        Chave já sorteada. Inscrições novas só na próxima edição.
      </p>
    );
  }
  if (!windowOpen) {
    const tooEarly = now < opens;
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-[12.5px] text-muted-foreground">
        {tooEarly
          ? `Inscrições abrem em ${new Date(opens).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
          : 'Janela de inscrições fechada.'}
      </p>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="text-[12.5px]">
        <p className="font-display text-[13.5px] font-bold text-foreground">Inscrições abertas</p>
        <p className="mt-0.5 text-muted-foreground">
          {tournament.registrationApproval === 'committee'
            ? 'Comissão revisa cada inscrição antes de aceitar.'
            : 'Inscrição automática — entra direto na chave após sorteio.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleRegister()}
        disabled={submitting}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trophy className="size-3.5" />
        )}
        Inscrever-me
      </button>
    </section>
  );
}

function EntryRow({
  entry,
  tournament,
  categoriesById,
  canManage,
  onSuccess,
  onError,
}: {
  entry: TournamentEntry;
  tournament: TournamentDetail;
  categoriesById: Map<string, string>;
  canManage: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);

  const isDrawn = tournament.status !== 'draft';
  const showApprove = canManage && entry.status === 'pending_approval' && !isDrawn;
  const showMoveCategory =
    canManage &&
    (entry.status === 'pending_seeding' || entry.status === 'pending_approval') &&
    !isDrawn;

  async function handleApprove() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await approveTournamentEntry(tournament.id, entry.id);
      onSuccess(`Inscrição de ${entry.userFullName} aprovada.`);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao aprovar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-[14px] font-bold">{entry.userFullName}</p>
          {entry.isWildCard ? (
            <span className="inline-flex h-5 items-center rounded-full bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
              Wild card
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          {entry.categoryId ? <span>{categoriesById.get(entry.categoryId) ?? '—'}</span> : null}
          {entry.ratingAtEntry != null ? <span>· rating {entry.ratingAtEntry}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <EntryStatusBadge status={entry.status} />
        {showApprove ? (
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={submitting}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] px-2 text-[11px] font-semibold text-[hsl(142_71%_32%)] hover:bg-[hsl(142_71%_32%/0.1)] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            Aprovar
          </button>
        ) : null}
        {showMoveCategory ? (
          <button
            type="button"
            onClick={() => setMoveOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-semibold hover:bg-muted"
          >
            Mover
          </button>
        ) : null}
      </div>
      {moveOpen ? (
        <MoveCategoryModal
          entry={entry}
          tournament={tournament}
          onClose={() => setMoveOpen(false)}
          onSuccess={(msg) => {
            setMoveOpen(false);
            onSuccess(msg);
          }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

function MoveCategoryModal({
  entry,
  tournament,
  onClose,
  onSuccess,
  onError,
}: {
  entry: TournamentEntry;
  tournament: TournamentDetail;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [targetCategoryId, setTargetCategoryId] = React.useState(entry.categoryId ?? '');
  const [asWildCard, setAsWildCard] = React.useState(entry.isWildCard);
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (!targetCategoryId) {
      setLocalError('Escolha uma categoria.');
      return;
    }
    setSubmitting(true);
    try {
      await moveTournamentEntryCategory(tournament.id, entry.id, {
        targetCategoryId,
        asWildCard,
      });
      onSuccess(`${entry.userFullName} movido${asWildCard ? ' como wild card' : ''}.`);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao mover categoria.'));
      setSubmitting(false);
    }
  }

  const sortedCategories = tournament.categories.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Mover categoria</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          Mover <strong>{entry.userFullName}</strong> de categoria. Wild card permite alocar em
          categoria fora do range esperado de rating.
        </p>
        {localError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
            {localError}
          </p>
        ) : null}
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Categoria
          </p>
          <select
            value={targetCategoryId}
            onChange={(e) => setTargetCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">— escolha —</option>
            {sortedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.minRatingExpected || c.maxRatingExpected
                  ? ` (rating ${c.minRatingExpected ?? '–'} a ${c.maxRatingExpected ?? '∞'})`
                  : ''}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={asWildCard}
            onChange={(e) => setAsWildCard(e.target.checked)}
          />
          Wild card (ignora restrição de rating)
        </label>
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
              <CheckCircle2 className="size-3.5" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
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
