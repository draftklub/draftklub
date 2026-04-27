'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/components/auth-provider';
import {
  cancelBooking,
  listMyBookings,
  type MyBookingItem,
} from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-B — minhas reservas cross-klub. Mesma UX do
 * `/k/:slug/minhas-reservas` (tabs Próximas/Passadas/Canceladas) mas
 * mostra nome do Klub no card pra dar contexto. Acessível via sidebar
 * "Você → Minhas reservas" (sempre visível).
 */

type Tab = 'upcoming' | 'past' | 'cancelled';

export default function MinhasReservasGlobalPage() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<Tab>('upcoming');
  const [bookings, setBookings] = React.useState<MyBookingItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError(null);
    listMyBookings()
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
  }, [user, reload]);

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
        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Você
          </p>
          <h1
            className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Minhas reservas
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Reservas em todos os Klubs em que você participa.
          </p>
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
          <EmptyState tab={tab} />
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
                    canCancel={tab === 'upcoming' && b.status !== 'cancelled'}
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
  canCancel,
  onActed,
}: {
  booking: MyBookingItem;
  canCancel: boolean;
  onActed: (msg: string) => void;
}) {
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const start = new Date(booking.startsAt);
  const end = booking.endsAt ? new Date(booking.endsAt) : null;
  const date = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const startLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endLabel = end
    ? end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const tone = statusTone(booking.status);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/k/${booking.klub.slug}/dashboard`}
              className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))] hover:underline"
            >
              {booking.klub.name}
            </Link>
            <StatusBadge tone={tone} label={statusLabel(booking.status)} />
          </div>
          <h3 className="mt-1 truncate font-display text-[15px] font-bold">
            {booking.space?.name ?? 'Quadra'}
          </h3>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 capitalize">
              <CalendarDays className="size-3" />
              {date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {startLabel}
              {endLabel ? ` – ${endLabel}` : ''}
            </span>
          </p>
          {booking.notes ? (
            <p className="mt-2 rounded-md border-l-2 border-primary/30 bg-muted/40 px-2 py-1 text-[12px] text-muted-foreground">
              {booking.notes}
            </p>
          ) : null}
        </div>

        {canCancel ? (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
          >
            <X className="size-3" />
            Cancelar
          </button>
        ) : null}
      </div>

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

function EmptyState({ tab }: { tab: Tab }) {
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
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Entre num Klub e use o botão <strong>Reservar quadra</strong> pra agendar.
        </p>
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
