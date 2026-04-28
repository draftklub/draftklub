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
  Plus,
  Timer,
  X,
} from 'lucide-react';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/components/auth-provider';
import { getMe, getMyKlubs } from '@/lib/api/me';
import {
  addPlayersToBooking,
  cancelBooking,
  listMyBookings,
  requestExtension,
  type MyBookingItem,
} from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-H2 — minhas reservas cross-klub agora é a única
 * página de reservas (substituiu /k/:slug/minhas-reservas). Cada card
 * mostra Klub + Quadra + horário e tem ações:
 * - Cancelar (qualquer participant)
 * - Estender (qualquer participant em booking confirmed)
 * - Adicionar player (só primary player)
 */

type Tab = 'upcoming' | 'past' | 'cancelled';

export default function MinhasReservasPage() {
  const { user } = useAuth();
  const [meId, setMeId] = React.useState<string | null>(null);
  const [klubs, setKlubs] = React.useState<UserKlubMembership[]>([]);
  const [tab, setTab] = React.useState<Tab>('upcoming');
  const [bookings, setBookings] = React.useState<MyBookingItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [klubPickerOpen, setKlubPickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getMe()
      .then((me) => {
        if (!cancelled) setMeId(me.id);
      })
      .catch(() => null);
    void getMyKlubs()
      .then((data) => {
        if (!cancelled) setKlubs(data);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
              Você
            </p>
            <h1
              className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Reservas
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Reservas em todos os Klubs em que você participa.
            </p>
          </div>
          <ReservarCTA klubs={klubs} onPickerOpen={() => setKlubPickerOpen(true)} />
        </header>

        {klubPickerOpen ? (
          <ReservarKlubPicker
            klubs={klubs}
            onClose={() => setKlubPickerOpen(false)}
          />
        ) : null}

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

function ReservarCTA({
  klubs,
  onPickerOpen,
}: {
  klubs: UserKlubMembership[];
  onPickerOpen: () => void;
}) {
  if (klubs.length === 0) return null;
  if (klubs.length === 1) {
    const slug = klubs[0]?.klubSlug;
    if (!slug) return null;
    return (
      <Link
        href={`/k/${slug}/reservar`}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="size-3.5" />
        Reservar quadra
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onPickerOpen}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Plus className="size-3.5" />
      Reservar quadra
    </button>
  );
}

function ReservarKlubPicker({
  klubs,
  onClose,
}: {
  klubs: UserKlubMembership[];
  onClose: () => void;
}) {
  return (
    <Modal title="Em qual Klub?" onClose={onClose}>
      <p className="text-[13px] text-muted-foreground">
        Você participa de mais de um Klub. Escolha onde reservar.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {klubs.map((k) => {
          const label = k.klubCommonName ?? k.klubName;
          return (
            <li key={k.klubId}>
              <Link
                href={`/k/${k.klubSlug}/reservar`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-[13.5px] font-medium hover:bg-muted"
              >
                <span className="truncate">{label}</span>
                <span className="text-[11.5px] text-muted-foreground">{k.klubSlug}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Modal>
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
  booking: MyBookingItem;
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
  const klubLabel = booking.klub.name;
  const hasActions = canCancel || canAddPlayers || canExtend;
  const pendingExtension = booking.extensions.find((e) => e.status === 'pending');

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/k/${booking.klub.slug}/dashboard`}
            className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))] hover:underline"
          >
            {klubLabel}
          </Link>
          <StatusBadge tone={tone} label={statusLabel(booking.status)} />
          {pendingExtension ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
              <Timer className="size-3" />
              Extensão pendente
            </span>
          ) : null}
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

      {hasActions ? (
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
    <Modal title="Cancelar reserva" onClose={onClose}>
      <p className="text-[13px] text-muted-foreground">
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
    </Modal>
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
    <Modal title="Adicionar player" onClose={onClose}>
      <p className="text-[13px] text-muted-foreground">
        Se o player não tem conta no DraftKlub, criamos um cadastro guest.
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
    </Modal>
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
    <Modal title="Estender reserva" onClose={onClose}>
      <p className="text-[13px] text-muted-foreground">
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
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        {children}
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
