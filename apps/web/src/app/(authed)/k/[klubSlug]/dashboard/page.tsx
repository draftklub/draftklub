'use client';

import * as React from 'react';
import { CalendarDays, LineChart, Trophy, User, X } from 'lucide-react';
import { Topbar } from '@/components/dashboard/topbar';
import { WeatherWidget } from '@/components/weather/weather-widget';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubTournaments, type TournamentListItem } from '@/lib/api/tournaments';
import { listKlubSports } from '@/lib/api/sports';
import { listKlubSpaces } from '@/lib/api/spaces';
import { listKlubBookings, type BookingListItem } from '@/lib/api/bookings';
import { getMyKlubs } from '@/lib/api/me';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, Settings, Sparkles, Timer, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipo do feed permanece pra <FeedIcon /> tipar o icon-by-status.
interface FeedItem {
  type: 'book' | 'cancel' | 'member' | 'tourney';
}

function todayHeader(): string {
  const now = new Date();
  const dia = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const cap = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${cap} · ${hora}`;
}

export default function DashboardPage() {
  return (
    <>
      <Topbar subtitle={todayHeader()} />
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 md:pb-6">
        <KlubWeatherRow />
        <OnboardingBanner />
        <ReservarCTA />
        <KlubAdminActions />
        {/* Tournaments + métricas em construção */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel
            title="Métricas operacionais"
            subtitle="Ocupação, KPIs de reserva, sócios ativos e receita"
            className="lg:col-span-2"
          >
            <MetricsPlaceholder />
          </Panel>

          <Panel title="Próximos torneios" subtitle="Inscrições ativas">
            <RealTournaments />
          </Panel>
        </section>

        {/* Activity feed */}
        <section>
          <Panel
            title="Atividade recente"
            subtitle="Últimas reservas, cancelamentos e novos sócios"
            headerExtra={
              <button
                type="button"
                className="rounded-lg border border-border bg-transparent px-3 py-1.75 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ver tudo
              </button>
            }
          >
            <RealActivityFeed />
          </Panel>
        </section>
      </main>
    </>
  );
}

// ─── Reservar CTA ────────────────────────────────────────────────────

function KlubWeatherRow() {
  const { klub } = useActiveKlub();
  if (!klub) return null;
  if (klub.latitude == null || klub.longitude == null) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <WeatherWidget latitude={klub.latitude} longitude={klub.longitude} />
    </div>
  );
}

/**
 * Sprint Polish PR-I1 — actions admin do Klub que antes ficavam na
 * sidebar. Visível pra KLUB_ADMIN, KLUB_ASSISTANT e SPORT_STAFF.
 */
function KlubAdminActions() {
  const { klub } = useActiveKlub();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    void getMyKlubs()
      .then((memberships) => {
        if (cancelled) return;
        const m = memberships.find((x) => x.klubId === klub.id);
        const role = m?.role;
        setIsAdmin(role === 'KLUB_ADMIN' || role === 'KLUB_ASSISTANT' || role === 'SPORT_STAFF');
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [klub]);

  if (!klub || !isAdmin) return null;

  const cards = [
    {
      label: 'Configurar Klub',
      hint: 'Identidade, contato, endereço, modalidades, quadras',
      icon: Settings,
      href: `/k/${klub.slug}/configurar`,
    },
    {
      label: 'Quadras',
      hint: 'Adicionar/editar espaços e horários',
      icon: LayoutGrid,
      href: `/k/${klub.slug}/configurar?tab=quadras`,
    },
    {
      label: 'Solicitações',
      hint: 'Aprovar/rejeitar entradas no Klub',
      icon: UserCheck,
      href: `/k/${klub.slug}/solicitacoes`,
    },
    {
      label: 'Extensões pendentes',
      hint: 'Aprovar/rejeitar pedidos de extensão',
      icon: Timer,
      href: `/k/${klub.slug}/extensions-pending`,
    },
  ];

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Gerenciar Klub
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[hsl(var(--brand-primary-600))]">
                <c.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.label}</p>
                <p className="truncate text-xs text-muted-foreground">{c.hint}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReservarCTA() {
  const { klub } = useActiveKlub();
  if (!klub) return null;
  return (
    <Link
      href={`/k/${klub.slug}/reservar`}
      className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm md:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarDays className="size-5" />
        </div>
        <div>
          <p className="font-display text-sm font-bold leading-tight">Reservar quadra</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Escolhe quadra, dia e horário em 3 toques
          </p>
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

// ─── Onboarding nudge ────────────────────────────────────────────────

function OnboardingBanner() {
  const { klub } = useActiveKlub();
  const [needsOnboarding, setNeedsOnboarding] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    void listKlubSpaces(klub.id)
      .then((spaces) => {
        if (!cancelled) setNeedsOnboarding(spaces.length === 0);
      })
      .catch(() => {
        if (!cancelled) setNeedsOnboarding(false);
      });
    return () => {
      cancelled = true;
    };
  }, [klub?.id]);

  if (!klub || !needsOnboarding) return null;

  return (
    <Link
      href={`/k/${klub.slug}/configurar?tab=modalidades`}
      className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[hsl(var(--brand-primary-600))]">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold leading-tight">
            Configure seu Klub pra começar a receber reservas
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Habilita modalidades, cria a primeira quadra e define horários — leva uns 3 minutos.
          </p>
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-[hsl(var(--brand-primary-600))]" />
    </Link>
  );
}

// ─── Real-data sections ─────────────────────────────────────────────

type TournamentWithSport = TournamentListItem & { sportCode: string };

function RealTournaments() {
  const { klub } = useActiveKlub();
  const [tournaments, setTournaments] = React.useState<TournamentWithSport[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubSports(klub.id)
      .then(async (profiles) => {
        const active = profiles.filter((p) => p.status === 'active');
        const lists = await Promise.all(
          active.map(async (p) => {
            const list = await listKlubTournaments(klub.id, p.sportCode).catch(
              () => [] as TournamentListItem[],
            );
            return list.map((t): TournamentWithSport => ({ ...t, sportCode: p.sportCode }));
          }),
        );
        if (cancelled) return;
        const all = lists.flat();
        const upcoming = all
          .filter((t) =>
            ['in_progress', 'prequalifying', 'open_registrations', 'draft'].includes(t.status),
          )
          .sort((a, b) => {
            const ta = a.mainStartDate ? Date.parse(a.mainStartDate) : Infinity;
            const tb = b.mainStartDate ? Date.parse(b.mainStartDate) : Infinity;
            return ta - tb;
          })
          .slice(0, 4);
        setTournaments(upcoming);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar torneios');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub]);

  if (error) {
    return <p className="py-2 text-xs text-destructive">{error}</p>;
  }
  if (tournaments === null) {
    return (
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="h-11 animate-pulse rounded-md bg-muted" />
        ))}
      </ul>
    );
  }
  if (tournaments.length === 0) {
    return (
      <p className="py-3 text-xs text-muted-foreground">
        Sem torneios ativos. Clique em <b>Torneios</b> pra criar.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {tournaments.map((t, i) => {
        const dateLabel = t.mainStartDate
          ? new Date(t.mainStartDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })
          : 'a definir';
        return (
          <li
            key={t.id}
            className={cn(
              'grid grid-cols-[1fr_auto] items-start gap-2 py-3',
              i === 0 && 'pt-0',
              i < tournaments.length - 1 && 'border-b border-border',
            )}
          >
            <Link
              href={`/k/${klub?.slug}/sports/${t.sportCode}/torneios/${t.id}`}
              className="min-w-0 transition-colors hover:text-foreground"
            >
              <p className="mb-0.5 truncate text-sm font-semibold leading-tight">{t.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Início {dateLabel} · {t.entryCount} inscritos
              </p>
            </Link>
            <span
              className="inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-xs font-bold uppercase tracking-[0.08em]"
              style={{
                background: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--brand-primary-600))',
              }}
            >
              {t.status.replace(/_/g, ' ')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RealActivityFeed() {
  const { klub } = useActiveKlub();
  const [bookings, setBookings] = React.useState<BookingListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    // Ultimas 24h em diante (passado e perto do futuro proximo).
    const startsAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    listKlubBookings(klub.id, { startsAfter })
      .then((data) => {
        if (cancelled) return;
        setBookings(data.slice(0, 8));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar atividade');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub]);

  if (error) {
    return <p className="py-2 text-xs text-destructive">{error}</p>;
  }
  if (bookings === null) {
    return (
      <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </ul>
    );
  }
  if (bookings.length === 0) {
    return (
      <p className="py-3 text-xs text-muted-foreground">Sem reservas recentes nas últimas 24h.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      {[bookings.slice(0, 4), bookings.slice(4, 8)].map((column, idx) => (
        <ul key={idx} className="flex flex-col">
          {column.map((b, i) => {
            const ts = new Date(b.startsAt);
            const time = ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateLabel = ts.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const type: FeedItem['type'] = b.status === 'cancelled' ? 'cancel' : 'book';
            return (
              <li
                key={b.id}
                className={cn(
                  'flex gap-3 py-3 text-sm',
                  i < column.length - 1 && 'border-b border-border',
                )}
              >
                <FeedIcon type={type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-semibold">{b.space?.name ?? 'Espaço'}</span> · {dateLabel}{' '}
                    {time}
                    {b.status === 'cancelled' ? ' · cancelada' : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    user {b.primaryPlayerId.slice(0, 8)}…
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────

function MetricsPlaceholder() {
  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-[hsl(var(--brand-primary-600))]">
        <LineChart className="size-5" strokeWidth={1.8} />
      </span>
      <div>
        <p className="font-display text-sm font-bold leading-tight">
          Dashboard de métricas em construção
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Reservas hoje, ocupação por hora, sócios ativos e receita do mês chegam na próxima
          sprint. Os números serão calculados a partir das suas reservas e bookings reais — sem
          dados de exemplo.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 pt-2" aria-hidden="true">
        <div className="h-2 w-3/4 rounded-full bg-muted" />
        <div className="h-2 w-1/2 rounded-full bg-muted" />
        <div className="h-2 w-2/3 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)}>
      <div className="mb-4.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 font-display text-sm font-bold" style={{ letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

function FeedIcon({ type }: { type: FeedItem['type'] }) {
  const cls = 'flex size-7.5 shrink-0 items-center justify-center rounded-lg';
  const inner = 'size-3.75';
  if (type === 'book') {
    return (
      <span
        className={cls}
        style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
      >
        <CalendarDays className={inner} strokeWidth={2} />
      </span>
    );
  }
  if (type === 'cancel') {
    return (
      <span
        className={cls}
        style={{
          background: 'hsl(var(--brand-secondary-500) / 0.1)',
          color: 'hsl(var(--brand-secondary-600))',
        }}
      >
        <X className={inner} strokeWidth={2.2} />
      </span>
    );
  }
  if (type === 'member') {
    return (
      <span
        className={cls}
        style={{ background: 'hsl(var(--brand-accent-500) / 0.14)', color: 'hsl(38 92% 30%)' }}
      >
        <User className={inner} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      className={cls}
      style={{
        background: 'hsl(var(--brand-primary-700) / 0.08)',
        color: 'hsl(var(--brand-primary-700))',
      }}
    >
      <Trophy className={inner} strokeWidth={2} />
    </span>
  );
}
