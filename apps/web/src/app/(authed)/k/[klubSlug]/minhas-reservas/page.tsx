'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Timer,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { useAuth } from '@/components/auth-provider';
import { getMe } from '@/lib/api/me';
import {
  addPlayersToBooking,
  cancelBooking,
  listKlubBookings,
  requestExtension,
  type BookingListItem,
} from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

/**
 * PR2b — lista as reservas do user logado neste Klub. Mobile-first
 * (cards em uma coluna). Permite cancelar bookings futuros.
 *
 * Filtro de tab (Próximas / Passadas / Canceladas) facilita escaneamento.
 * Cross-klub `/me/bookings` fica pra PR posterior.
 */

type Tab = 'upcoming' | 'past' | 'cancelled';

export default function MinhasReservasPage() {
  const { klub } = useActiveKlub();
  const { user } = useAuth();
  const [meId, setMeId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>('upcoming');
  const [bookings, setBookings] = React.useState<BookingListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  // Pega userId do backend (Firebase user.uid != User.id no DB).
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getMe()
      .then((me) => {
        if (!cancelled) setMeId(me.id);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    if (!klub || !meId) return;
    let cancelled = false;
    setError(null);
    listKlubBookings(klub.id, { primaryPlayerId: meId })
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar reservas.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, meId, reload]);

  if (!klub) return null;

  const now = Date.now();
  const filtered = (bookings ?? []).filter((b) => {
    const start = new Date(b.startsAt).getTime();
    const isCancelled = b.status === 'cancelled' || b.status === 'rejected';
    if (tab === 'cancelled') return isCancelled;
    if (tab === 'upcoming') return !isCancelled && start >= now;
    return !isCancelled && start < now;
  });

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pro Klub
        </Link>

        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
              Minhas reservas
            </p>
            <h1
              className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              {klub.name}
            </h1>
          </div>
          <Link
            href={`/k/${klub.slug}/reservar`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CalendarPlus className="size-3.5" />
            Reservar
          </Link>
        </header>

        <div className="flex gap-1 border-b border-border">
          <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')} label="Próximas" />
          <TabButton active={tab === 'past'} onClick={() => setTab('past')} label="Passadas" />
          <TabButton
            active={tab === 'cancelled'}
            onClick={() => setTab('cancelled')}
            label="Canceladas"
          />
        </div>

        {actionMessage ? (
          <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
            <CheckCircle2 className="mr-1 inline size-3.5" />
            {actionMessage}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : bookings === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} klubSlug={klub.slug} />
        ) : (
          <ul className="space-y-3">
            {filtered
              .sort((a, b) =>
                tab === 'past'
                  ? new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
                  : new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
              )
              .map((b) => (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    meId={meId}
                    canCancel={tab === 'upcoming' && b.status !== 'cancelled'}
                    canAddPlayers={
                      tab === 'upcoming' &&
                      b.status === 'confirmed' &&
                      b.primaryPlayerId === meId
                    }
                    canExtend={tab === 'upcoming' && b.status === 'confirmed'}
                    onActed={(msg) => {
                      setActionMessage(msg);
                      setReload((n) => n + 1);
                    }}
                  />
                </li>
              ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center border-b-2 px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function BookingCard({
  booking,
  meId,
  canCancel,
  canAddPlayers,
  canExtend,
  onActed,
}: {
  booking: BookingListItem;
  meId: string | null;
  canCancel: boolean;
  canAddPlayers: boolean;
  canExtend: boolean;
  onActed: (msg: string) => void;
}) {
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [addPlayersOpen, setAddPlayersOpen] = React.useState(false);
  const [extendOpen, setExtendOpen] = React.useState(false);
  void meId;
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  const date = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const startLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endLabel = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const tone = statusTone(booking.status);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-[15px] font-bold">
              {booking.space?.name ?? 'Quadra'}
            </h3>
            <StatusBadge tone={tone} label={statusLabel(booking.status)} />
          </div>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 capitalize">
              <CalendarDays className="size-3" />
              {date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {startLabel} – {endLabel}
            </span>
          </p>
          {booking.notes ? (
            <p className="mt-2 rounded-md border-l-2 border-primary/30 bg-muted/40 px-2 py-1 text-[12px] text-muted-foreground">
              {booking.notes}
            </p>
          ) : null}
        </div>

      </div>

      {(canCancel || canAddPlayers || canExtend) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {canAddPlayers ? (
            <button
              type="button"
              onClick={() => setAddPlayersOpen(true)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-semibold hover:bg-muted"
            >
              <Plus className="size-3" />
              Adicionar player
            </button>
          ) : null}
          {canExtend ? (
            <button
              type="button"
              onClick={() => setExtendOpen(true)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-semibold hover:bg-muted"
            >
              <Timer className="size-3" />
              Estender
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="ml-auto inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
            >
              <X className="size-3" />
              Cancelar
            </button>
          ) : null}
        </div>
      ) : null}

      {cancelOpen ? (
        <CancelModal
          bookingId={booking.id}
          onClose={() => setCancelOpen(false)}
          onCancelled={() => {
            setCancelOpen(false);
            onActed('Reserva cancelada.');
          }}
        />
      ) : null}
      {addPlayersOpen ? (
        <AddPlayersModal
          bookingId={booking.id}
          onClose={() => setAddPlayersOpen(false)}
          onAdded={(count) => {
            setAddPlayersOpen(false);
            onActed(count === 1 ? 'Player adicionado.' : `${count} players adicionados.`);
          }}
        />
      ) : null}
      {extendOpen ? (
        <ExtendModal
          bookingId={booking.id}
          onClose={() => setExtendOpen(false)}
          onRequested={(autoApproved) => {
            setExtendOpen(false);
            onActed(
              autoApproved
                ? 'Extensão aprovada. Horário atualizado.'
                : 'Extensão solicitada — staff vai revisar.',
            );
          }}
        />
      ) : null}
    </div>
  );
}

function AddPlayersModal({
  bookingId,
  onClose,
  onAdded,
}: {
  bookingId: string;
  onClose: () => void;
  onAdded: (count: number) => void;
}) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await addPlayersToBooking(bookingId, [
        { guest: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() } },
      ]);
      onAdded(1);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao adicionar.',
      );
      setSubmitting(false);
    }
  }

  const valid = firstName.trim() && lastName.trim() && /.+@.+\..+/.test(email);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <h2 className="font-display text-lg font-bold">Adicionar player</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Se o player não tem conta no DraftKlub, criamos um cadastro guest no Klub.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nome"
            maxLength={100}
            className="rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Sobrenome"
            maxLength={100}
            className="rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          type="email"
          className="mt-2 w-full rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
        {error ? (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!valid || submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtendModal({
  bookingId,
  onClose,
  onRequested,
}: {
  bookingId: string;
  onClose: () => void;
  onRequested: (autoApproved: boolean) => void;
}) {
  const [minutes, setMinutes] = React.useState(30);
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleRequest() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestExtension(bookingId, minutes, notes.trim() || undefined);
      const autoApproved = result.extension?.status === 'approved';
      onRequested(autoApproved);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao solicitar.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <h2 className="font-display text-lg font-bold">Estender reserva</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Dependendo da config do Klub a extensão pode ser automática ou aguardar
          aprovação do staff.
        </p>
        <div className="mt-3 flex gap-2">
          {[30, 60, 90].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={cn(
                'flex-1 rounded-[10px] border p-3 text-[13px] font-semibold transition-colors',
                minutes === m
                  ? 'border-primary bg-primary/10 text-[hsl(var(--brand-primary-600))]'
                  : 'border-input bg-background hover:bg-muted',
              )}
            >
              +{m}min
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Motivo (opcional)"
          rows={2}
          maxLength={500}
          className="mt-3 w-full rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
        {error ? (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleRequest()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Timer className="size-3.5" />}
            Solicitar
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  bookingId,
  onClose,
  onCancelled,
}: {
  bookingId: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCancel() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await cancelBooking(bookingId, reason.trim());
      onCancelled();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao cancelar.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <h2 className="font-display text-lg font-bold">Cancelar reserva</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Conta o motivo (mín 10 chars). O Klub vai receber pra ajustar agenda se preciso.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Imprevisto familiar, não vou conseguir."
          rows={3}
          maxLength={500}
          className="mt-3 w-full rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {reason.trim().length}/500 (mín 10)
        </p>
        {error ? (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={reason.trim().length < 10 || submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            Cancelar reserva
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  tone,
  label,
}: {
  tone: 'green' | 'amber' | 'red' | 'muted';
  label: string;
}) {
  const cls =
    tone === 'green'
      ? 'bg-[hsl(142_71%_32%/0.12)] text-[hsl(142_71%_32%)]'
      : tone === 'amber'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : tone === 'red'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        cls,
      )}
    >
      {label}
    </span>
  );
}

function EmptyState({ tab, klubSlug }: { tab: Tab; klubSlug: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <MapPin className="size-4" />
      </div>
      <p className="mt-3 font-display text-[14px] font-bold">
        {tab === 'upcoming'
          ? 'Sem reservas agendadas'
          : tab === 'past'
            ? 'Sem reservas passadas'
            : 'Sem reservas canceladas'}
      </p>
      {tab === 'upcoming' ? (
        <Link
          href={`/k/${klubSlug}/reservar`}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <CalendarPlus className="size-3.5" />
          Fazer uma reserva
        </Link>
      ) : null}
    </div>
  );
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'muted' {
  if (status === 'confirmed' || status === 'completed') return 'green';
  if (status === 'pending' || status === 'pending_payment') return 'amber';
  if (status === 'cancelled' || status === 'rejected' || status === 'no_show') return 'red';
  return 'muted';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendente',
    pending_payment: 'Pgto pendente',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    rejected: 'Rejeitada',
    no_show: 'No-show',
  };
  return map[status] ?? status;
}
