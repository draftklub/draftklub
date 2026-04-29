'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { MembershipRequestForUser, UserKlubMembership } from '@draftklub/shared-types';
import { useAuth } from '@/components/auth-provider';
import { EmailVerifyBanner } from '@/components/email-verify-banner';
import { getMyKlubs } from '@/lib/api/me';
import { cancelMyMembershipRequest, listMyMembershipRequests } from '@/lib/api/membership-requests';
import { listMyBookings, type MyBookingItem } from '@/lib/api/bookings';
import { KlubAvatar } from '@/components/ui/klub-avatar';
import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const { user } = useAuth();

  const {
    data: klubs,
    error: klubsError,
    refetch: refetchKlubs,
  } = useQuery({
    queryKey: ['my-klubs'],
    queryFn: getMyKlubs,
  });

  const { data: allRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['my-membership-requests'],
    queryFn: listMyMembershipRequests,
  });
  const pendingRequests = React.useMemo(
    () => allRequests?.filter((r) => r.status === 'pending') ?? null,
    [allRequests],
  );

  const {
    data: bookingsPage,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listMyBookings(),
  });
  const bookings = bookingsPage?.items ?? null;

  React.useEffect(() => {
    if (!klubsError) return;
    toast.error('Falha ao carregar seus Klubs', {
      action: { label: 'Tentar de novo', onClick: () => void refetchKlubs() },
    });
  }, [klubsError, refetchKlubs]);

  React.useEffect(() => {
    if (!bookingsError) return;
    toast.error('Falha ao carregar reservas', {
      action: { label: 'Tentar de novo', onClick: () => void refetchBookings() },
    });
  }, [bookingsError, refetchBookings]);

  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0] ?? '';
  const hasKlubs = klubs !== undefined && klubs.length > 0;
  const isSingleKlub = klubs?.length === 1;

  const now = Date.now();
  const upcomingBookings = React.useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter((b) => {
        const isCancelled = b.status === 'cancelled' || b.status === 'rejected';
        return !isCancelled && new Date(b.startsAt).getTime() >= now;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [bookings, now]);

  const loading = klubs === undefined && !klubsError;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <EmailVerifyBanner />

        {/* Header */}
        <header className="mb-8">
          <h1
            className="font-display text-3xl font-bold md:text-4xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            Olá{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {loading
              ? 'Carregando seus Klubs…'
              : !hasKlubs
                ? 'Você ainda não está em nenhum Klub. Use a barra lateral pra encontrar ou criar um.'
                : isSingleKlub
                  ? 'Aqui está o resumo do seu Klub.'
                  : `Aqui está o resumo dos seus ${klubs.length} Klubs.`}
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasKlubs ? (
          /* ── Sem Klubs ────────────────────────────────────────── */
          <>
            {pendingRequests && pendingRequests.length > 0 ? (
              <PendingRequestsSection
                requests={pendingRequests}
                onCancelled={() => void refetchRequests()}
              />
            ) : null}
            <ShortcutsSection />
          </>
        ) : isSingleKlub && klubs[0] ? (
          /* ── Single-Klub dashboard ────────────────────────────── */
          <SingleKlubDashboard
            klub={klubs[0]}
            upcomingBookings={upcomingBookings}
            pendingRequestsCount={pendingRequests?.length ?? 0}
            onCancelRequest={() => void refetchRequests()}
            pendingRequests={pendingRequests ?? []}
          />
        ) : (
          /* ── Multi-Klub dashboard ─────────────────────────────── */
          <MultiKlubDashboard
            klubs={klubs}
            upcomingBookings={upcomingBookings}
            pendingRequests={pendingRequests ?? []}
            onCancelRequest={() => void refetchRequests()}
          />
        )}

        {/* Sales-led */}
        <p className="mt-12 text-center text-xs text-muted-foreground">
          <Link
            href="/quero-criar-klub"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Sou dono de um Klub e quero saber mais
          </Link>
        </p>
      </div>
    </main>
  );
}

// ─── Single-Klub Dashboard ────────────────────────────────────────────────────

function SingleKlubDashboard({
  klub,
  upcomingBookings,
  pendingRequestsCount,
  pendingRequests,
  onCancelRequest,
}: {
  klub: UserKlubMembership;
  upcomingBookings: MyBookingItem[];
  pendingRequestsCount: number;
  pendingRequests: MembershipRequestForUser[];
  onCancelRequest: () => void;
}) {
  const klubBookings = upcomingBookings.filter((b) => b.klub.slug === klub.klubSlug);
  const firstSport = klub.sports?.[0];

  return (
    <div className="space-y-6">
      {/* Klub hero card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <KlubAvatar name={klub.klubCommonName ?? klub.klubName} />
            <div className="min-w-0">
              <h2
                className="truncate font-display text-xl font-bold leading-tight"
                style={{ letterSpacing: '-0.01em' }}
              >
                {klub.klubCommonName ?? klub.klubName}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">/{klub.klubSlug}</p>
            </div>
          </div>
          <Link
            href={`/k/${klub.klubSlug}/dashboard`}
            className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
          >
            Dashboard
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <KpiCard label="Próximas reservas" value={klubBookings.length} href="/minhas-reservas" />
          <KpiCard
            label="Solicitações"
            value={pendingRequestsCount}
            href="#"
            muted={pendingRequestsCount === 0}
          />
          <KpiCard
            label="Modalidades"
            value={klub.sports?.length ?? 0}
            href={firstSport ? `/k/${klub.klubSlug}/sports/${firstSport}/dashboard` : '#'}
          />
        </div>

        {/* Quick actions */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Link
            href={`/k/${klub.klubSlug}/reservar`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Reservar quadra
          </Link>
          {firstSport ? (
            <>
              <Link
                href={`/k/${klub.klubSlug}/sports/${firstSport}/torneios`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-xs font-semibold hover:bg-muted"
              >
                Torneios
              </Link>
              <Link
                href={`/k/${klub.klubSlug}/sports/${firstSport}/rankings`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-xs font-semibold hover:bg-muted"
              >
                Rankings
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Próximas reservas */}
      {klubBookings.length > 0 ? (
        <section>
          <SectionTitle
            label="Próximas reservas"
            action={{ href: '/minhas-reservas', label: 'Ver todas' }}
          />
          <ul className="space-y-2">
            {klubBookings.slice(0, 3).map((b) => (
              <li key={b.id}>
                <BookingRow booking={b} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Solicitações pendentes */}
      {pendingRequests.length > 0 ? (
        <PendingRequestsSection requests={pendingRequests} onCancelled={onCancelRequest} />
      ) : null}

      <ShortcutsSection />
    </div>
  );
}

// ─── Multi-Klub Dashboard ─────────────────────────────────────────────────────

function MultiKlubDashboard({
  klubs,
  upcomingBookings,
  pendingRequests,
  onCancelRequest,
}: {
  klubs: UserKlubMembership[];
  upcomingBookings: MyBookingItem[];
  pendingRequests: MembershipRequestForUser[];
  onCancelRequest: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* KPI summary row */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Próximas reservas"
          value={upcomingBookings.length}
          href="/minhas-reservas"
        />
        <KpiCard label="Seus Klubs" value={klubs.length} href="/klubs" />
        <KpiCard
          label="Solicitações"
          value={pendingRequests.length}
          href="#"
          muted={pendingRequests.length === 0}
        />
      </div>

      {/* Próximas reservas — cross-klub */}
      {upcomingBookings.length > 0 ? (
        <section>
          <SectionTitle
            label="Próximas reservas"
            action={{ href: '/minhas-reservas', label: 'Ver todas' }}
          />
          <ul className="space-y-2">
            {upcomingBookings.slice(0, 5).map((b) => (
              <li key={b.id}>
                <BookingRow booking={b} showKlub />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Per-klub cards */}
      <section>
        <SectionTitle label="Seus Klubs" action={{ href: '/klubs', label: 'Ver todos' }} />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {klubs.map((k) => {
            const next = upcomingBookings.find((b) => b.klub.slug === k.klubSlug);
            return (
              <li key={k.klubId}>
                <KlubDashCard klub={k} nextBooking={next} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Solicitações pendentes */}
      {pendingRequests.length > 0 ? (
        <PendingRequestsSection requests={pendingRequests} onCancelled={onCancelRequest} />
      ) : null}

      <ShortcutsSection />
    </div>
  );
}

// ─── KlubDashCard ─────────────────────────────────────────────────────────────

function KlubDashCard({
  klub,
  nextBooking,
}: {
  klub: UserKlubMembership;
  nextBooking?: MyBookingItem;
}) {
  const pending = klub.reviewStatus === 'pending';
  const rejected = klub.reviewStatus === 'rejected';
  const href = pending || rejected ? '/klubs' : `/k/${klub.klubSlug}/dashboard`;
  const label = klub.klubCommonName ?? klub.klubName;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <KlubAvatar name={label} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight">{label}</h3>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            /{klub.klubSlug}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      {nextBooking ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3 shrink-0" />
          <span className="truncate">
            {new Date(nextBooking.startsAt).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}
            {' · '}
            {new Date(nextBooking.startsAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ) : pending ? (
        <Badge tone="warning" className="mt-3 w-fit">
          Em análise
        </Badge>
      ) : rejected ? (
        <Badge tone="destructive" className="mt-3 w-fit">
          Rejeitado
        </Badge>
      ) : null}
    </Link>
  );
}

// ─── BookingRow ───────────────────────────────────────────────────────────────

function BookingRow({ booking, showKlub }: { booking: MyBookingItem; showKlub?: boolean }) {
  const start = new Date(booking.startsAt);
  const end = booking.endsAt ? new Date(booking.endsAt) : null;
  const dateLabel = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const timeLabel = `${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${end ? ` – ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`;

  return (
    <Link
      href="/minhas-reservas"
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MapPin className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {showKlub ? (
          <p className="mb-0.5 truncate text-xs font-bold uppercase tracking-widest text-brand-primary-600">
            {booking.klub.name}
          </p>
        ) : null}
        <p className="truncate text-sm font-semibold">{booking.space?.name ?? 'Quadra'}</p>
        <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 capitalize">
            <CalendarDays className="size-3" />
            {dateLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {timeLabel}
          </span>
        </p>
      </div>
    </Link>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  href,
  muted,
}: {
  label: string;
  value: number;
  href: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30"
    >
      <span
        className={
          muted
            ? 'font-display text-2xl font-bold text-muted-foreground'
            : 'font-display text-2xl font-bold'
        }
        style={{ letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
    </Link>
  );
}

// ─── PendingRequestsSection ───────────────────────────────────────────────────

function PendingRequestsSection({
  requests,
  onCancelled,
}: {
  requests: MembershipRequestForUser[];
  onCancelled: () => void;
}) {
  return (
    <section>
      <SectionTitle label="Solicitações em análise" />
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id}>
            <PendingRequestCard request={r} onCancelled={onCancelled} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PendingRequestCard({
  request,
  onCancelled,
}: {
  request: MembershipRequestForUser;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelMyMembershipRequest(request.id);
      onCancelled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar.');
      setCancelling(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{request.klub.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          Aguardando aprovação do admin do Klub.
        </p>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={cancelling}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
      >
        {cancelling ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        Cancelar
      </button>
    </div>
  );
}

// ─── ShortcutsSection ─────────────────────────────────────────────────────────

function ShortcutsSection() {
  return (
    <section>
      <SectionTitle label="Atalhos" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ShortcutCard
          href="/buscar-klubs"
          icon={Search}
          title="Buscar um Klub"
          body="Encontre clubes pra entrar como sócio."
        />
        <ShortcutCard
          href="/criar-klub"
          icon={Plus}
          title="Criar meu Klub"
          body="Self-service: você vira Klub Admin."
        />
      </div>
    </section>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-primary-600">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      </div>
      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({
  label,
  action,
}: {
  label: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

// KlubAvatar movido pra @/components/ui/klub-avatar (Sprint M batch SM-4).
