'use client';

import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  DollarSign,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { Topbar } from '@/components/dashboard/topbar';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubTournaments, type TournamentListItem } from '@/lib/api/tournaments';
import { listKlubSports } from '@/lib/api/sports';
import { listKlubBookings, type BookingListItem } from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

const HOURS: { h: string; pct: number; prime: boolean }[] = [
  { h: '08:00', pct: 32, prime: false },
  { h: '09:00', pct: 48, prime: false },
  { h: '10:00', pct: 65, prime: false },
  { h: '11:00', pct: 58, prime: false },
  { h: '12:00', pct: 30, prime: false },
  { h: '14:00', pct: 42, prime: false },
  { h: '16:00', pct: 56, prime: false },
  { h: '17:00', pct: 72, prime: false },
  { h: '18:00', pct: 92, prime: true },
  { h: '19:00', pct: 100, prime: true },
  { h: '20:00', pct: 96, prime: true },
  { h: '21:00', pct: 88, prime: true },
  { h: '22:00', pct: 64, prime: true },
];

interface KpiData {
  label: string;
  icon: typeof CalendarDays;
  value: string;
  unit?: string;
  delta: string;
  deltaTone: 'up' | 'down';
  deltaContext: string;
  spark: string;
  sparkColor: 'primary' | 'destructive';
}

const KPIS: KpiData[] = [
  {
    label: 'Reservas hoje',
    icon: CalendarDays,
    value: '87',
    delta: '+12',
    deltaTone: 'up',
    deltaContext: 'vs ontem',
    spark: '0,18 8,14 16,16 24,10 32,12 40,6 48,8 56,2',
    sparkColor: 'primary',
  },
  {
    label: 'Taxa de ocupação',
    icon: Building2,
    value: '74',
    unit: '%',
    delta: '+6pp',
    deltaTone: 'up',
    deltaContext: 'vs ontem',
    spark: '0,14 8,12 16,8 24,10 32,6 40,8 48,4 56,3',
    sparkColor: 'primary',
  },
  {
    label: 'Sócios ativos · mês',
    icon: Users,
    value: '412',
    delta: '+18',
    deltaTone: 'up',
    deltaContext: 'vs mês passado',
    spark: '0,16 8,14 16,12 24,12 32,8 40,9 48,6 56,4',
    sparkColor: 'primary',
  },
  {
    label: 'Receita do mês',
    icon: DollarSign,
    value: 'R$ 64,8',
    unit: 'k',
    delta: '−2,1%',
    deltaTone: 'down',
    deltaContext: 'vs mês passado',
    spark: '0,8 8,6 16,10 24,8 32,12 40,10 48,14 56,12',
    sparkColor: 'destructive',
  },
];

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
      <Topbar subtitle={todayHeader()} activeSport="Tennis" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* KPI row */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        {/* Two-col: occupancy + tournaments */}
        <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel
            title="Ocupação por hora · hoje"
            subtitle="Tennis · 8 quadras · prime time 18h–22h destacado"
            className="lg:col-span-2"
            headerExtra={<OccupancyLegend />}
          >
            <div className="flex flex-col gap-[7px]">
              {HOURS.map((row) => (
                <HourRow key={row.h} row={row} />
              ))}
            </div>
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
                className="rounded-lg border border-border bg-transparent px-3 py-[7px] text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
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

// ─── Real-data sections ─────────────────────────────────────────────

function RealTournaments() {
  const { klub } = useActiveKlub();
  const [tournaments, setTournaments] = React.useState<TournamentListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubSports(klub.id)
      .then(async (profiles) => {
        const active = profiles.filter((p) => p.status === 'active');
        const lists = await Promise.all(
          active.map((p) =>
            listKlubTournaments(klub.id, p.sportCode).catch(() => [] as TournamentListItem[]),
          ),
        );
        if (cancelled) return;
        const all = lists.flat();
        const upcoming = all
          .filter((t) => ['in_progress', 'prequalifying', 'open_registrations', 'draft'].includes(t.status))
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
    return <p className="py-2 text-[12px] text-destructive">{error}</p>;
  }
  if (tournaments === null) {
    return (
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="h-[44px] animate-pulse rounded-md bg-muted" />
        ))}
      </ul>
    );
  }
  if (tournaments.length === 0) {
    return (
      <p className="py-3 text-[12.5px] text-muted-foreground">
        Sem torneios ativos. Clique em <b>Torneios</b> pra criar.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {tournaments.map((t, i) => {
        const dateLabel = t.mainStartDate
          ? new Date(t.mainStartDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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
            <div className="min-w-0">
              <p className="mb-0.5 truncate text-[13.5px] font-semibold leading-tight">
                {t.name}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                Início {dateLabel} · {t.entryCount} inscritos
              </p>
            </div>
            <span
              className="inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[9.5px] font-bold uppercase tracking-[0.08em]"
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
    return <p className="py-2 text-[12px] text-destructive">{error}</p>;
  }
  if (bookings === null) {
    return (
      <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-[48px] animate-pulse rounded-md bg-muted" />
        ))}
      </ul>
    );
  }
  if (bookings.length === 0) {
    return (
      <p className="py-3 text-[12.5px] text-muted-foreground">
        Sem reservas recentes nas últimas 24h.
      </p>
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
                  'flex gap-3 py-3 text-[13px]',
                  i < column.length - 1 && 'border-b border-border',
                )}
              >
                <FeedIcon type={type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-semibold">
                      {b.space?.name ?? 'Espaço'}
                    </span>{' '}
                    · {dateLabel} {time}
                    {b.status === 'cancelled' ? ' · cancelada' : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                    user {b.primaryPlayerId.slice(0, 8)}…
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ))}
    </div>);
}

// ─── Pieces ──────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KpiData }) {
  const Icon = kpi.icon;
  const sparkStroke =
    kpi.sparkColor === 'destructive' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
  return (
    <div className="relative rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="size-[13px]" strokeWidth={1.8} />
        {kpi.label}
      </div>
      <div
        className="mt-2 font-display text-[30px] font-bold leading-none tabular-nums"
        style={{ letterSpacing: '-0.02em' }}
      >
        {kpi.value}
        {kpi.unit ? (
          <span
            className="ml-0.5 font-medium text-muted-foreground"
            style={{ fontSize: kpi.value.startsWith('R$') ? '16px' : '18px' }}
          >
            {kpi.unit}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'mt-1.5 inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold',
          kpi.deltaTone === 'up' ? 'text-[hsl(142_71%_32%)]' : 'text-destructive',
        )}
      >
        {kpi.deltaTone === 'up' ? (
          <ArrowUp className="size-3" strokeWidth={2} />
        ) : (
          <ArrowDown className="size-3" strokeWidth={2} />
        )}
        {kpi.delta}
        <span className="ml-0.5 font-medium text-muted-foreground">
          {kpi.deltaContext}
        </span>
      </div>
      <svg
        className="absolute bottom-3.5 right-3.5 opacity-55"
        width="60"
        height="22"
        viewBox="0 0 60 22"
        aria-hidden="true"
      >
        <polyline
          points={kpi.spark}
          fill="none"
          stroke={sparkStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={kpi.sparkColor === 'destructive' ? 0.7 : 1}
        />
      </svg>
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
      <div className="mb-[18px] flex items-start justify-between gap-3">
        <div>
          <h2
            className="mb-1 font-display text-[15px] font-bold"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

function OccupancyLegend() {
  return (
    <div className="flex items-center gap-3.5 text-[11.5px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-primary" />
        Regular
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-sm"
          style={{ background: 'hsl(var(--brand-accent-500))' }}
        />
        Prime
      </span>
    </div>
  );
}

function HourRow({ row }: { row: { h: string; pct: number; prime: boolean } }) {
  return (
    <div className="grid grid-cols-[50px_1fr_60px] items-center gap-3">
      <span
        className={cn(
          'font-mono text-[11px] font-semibold',
          row.prime ? 'text-[hsl(38_92%_28%)] font-bold' : 'text-muted-foreground',
        )}
      >
        {row.h}
      </span>
      <div className="relative h-[22px] overflow-hidden rounded-md bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
          style={{
            width: `${row.pct}%`,
            background: row.prime
              ? 'hsl(var(--brand-accent-500))'
              : 'hsl(var(--primary))',
          }}
        />
      </div>
      <span
        className={cn(
          'text-right font-mono text-[11.5px] font-semibold',
          row.prime ? 'text-[hsl(38_92%_28%)]' : 'text-foreground',
        )}
      >
        {row.pct}%
      </span>
    </div>
  );
}

function FeedIcon({ type }: { type: FeedItem['type'] }) {
  const cls = 'flex size-[30px] shrink-0 items-center justify-center rounded-lg';
  const inner = 'size-[15px]';
  if (type === 'book') {
    return (
      <span className={cls} style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
        <CalendarDays className={inner} strokeWidth={2} />
      </span>
    );
  }
  if (type === 'cancel') {
    return (
      <span
        className={cls}
        style={{ background: 'hsl(var(--brand-secondary-500) / 0.1)', color: 'hsl(var(--brand-secondary-600))' }}
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
      style={{ background: 'hsl(var(--brand-primary-700) / 0.08)', color: 'hsl(var(--brand-primary-700))' }}
    >
      <Trophy className={inner} strokeWidth={2} />
    </span>
  );
}
