'use client';

/**
 * Sprint O batch O-3 — extraído de _components.tsx (megafile 2789 linhas).
 * Cobre o lado consumer da rota /torneios/:id/inscritos: EntriesView +
 * RegistrationCTA (CTA do player), EntryRow (cada inscrito), MoveCategoryModal
 * e EntryStatusBadge.
 *
 * Helpers (`toErrorMessage`, `inputCls`) duplicados temporariamente —
 * próximo batch consolida em `./_shared`.
 */

import * as React from 'react';
import { CheckCircle2, Inbox, Loader2, Trophy, Users, XCircle } from 'lucide-react';
import type { TournamentDetail, TournamentEntry } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  approveTournamentEntry,
  moveTournamentEntryCategory,
  registerTournamentEntry,
  withdrawMyTournamentEntry,
} from '@/lib/api/tournaments';

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Entries view ───────────────────────────────────────────────────────

export function EntriesView({
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
    return <EmptyState icon={Users} title="Lista de inscritos não disponível" />;
  }

  const categoriesById = new Map(tournament.categories.map((c) => [c.id, c.name]));
  const myEntry =
    meId != null ? entries.find((e) => e.userId === meId && e.status !== 'withdrawn') : undefined;

  return (
    <div className="space-y-3">
      {actionMessage ? <Banner tone="success">{actionMessage}</Banner> : null}
      {actionError ? <Banner tone="error">{actionError}</Banner> : null}

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
        <EmptyState icon={Inbox} title="Sem inscritos ainda" />
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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/5 p-3.5">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="size-4 text-success" />
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
            className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
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
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Chave já sorteada. Inscrições novas só na próxima edição.
      </p>
    );
  }
  if (!windowOpen) {
    const tooEarly = now < opens;
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        {tooEarly
          ? `Inscrições abrem em ${new Date(opens).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
          : 'Janela de inscrições fechada.'}
      </p>
    );
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="text-xs">
        <p className="font-display text-sm font-bold text-foreground">Inscrições abertas</p>
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
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
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
          <p className="truncate font-display text-sm font-bold">{entry.userFullName}</p>
          {entry.isWildCard ? (
            <span className="inline-flex h-5 items-center rounded-full bg-warning/15 px-2 text-xs font-bold uppercase tracking-[0.06em] text-warning-foreground">
              Wild card
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
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
            className="inline-flex h-8 items-center gap-1 rounded-md border border-success/30 bg-success/5 px-2 text-xs font-semibold text-success hover:bg-success/10 disabled:opacity-60"
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
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-semibold hover:bg-muted"
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
        <p className="text-xs text-muted-foreground">
          Mover <strong>{entry.userFullName}</strong> de categoria. Wild card permite alocar em
          categoria fora do range esperado de rating.
        </p>
        {localError ? <Banner tone="error">{localError}</Banner> : null}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
        <label className="flex items-center gap-2 text-xs">
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
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
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
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <CheckCircle2 className="size-3" />
        Confirmado
      </span>
    );
  }
  if (status === 'pending_approval') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-foreground">
        <Loader2 className="size-3" />
        Aguarda aprovação
      </span>
    );
  }
  if (status === 'pending_seeding') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Trophy className="size-3" />
        Aguarda sorteio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
      <XCircle className="size-3" />
      Withdrawn
    </span>
  );
}
