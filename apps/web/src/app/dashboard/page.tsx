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

interface Tournament {
  name: string;
  meta: string;
  progress?: number;
  progressColor?: 'primary' | 'accent' | 'sky';
  badge: { label: string; bg: string; fg: string };
}

const TOURNAMENTS: Tournament[] = [
  {
    name: 'Copa Outono · Tennis B',
    meta: 'Início 28 abr · 84 inscritos / 96',
    progress: 87,
    progressColor: 'primary',
    badge: {
      label: 'Aberto',
      bg: 'hsl(var(--primary) / 0.1)',
      fg: 'hsl(var(--brand-primary-600))',
    },
  },
  {
    name: 'Padel Duplas Mistas',
    meta: 'Início 5 mai · 38 inscritos / 64',
    progress: 59,
    progressColor: 'accent',
    badge: {
      label: 'Aberto',
      bg: 'hsl(var(--brand-accent-500) / 0.14)',
      fg: 'hsl(38 92% 28%)',
    },
  },
  {
    name: 'Beach Tennis · Verão',
    meta: 'Início 12 mai · 16 inscritos / 32',
    progress: 50,
    progressColor: 'sky',
    badge: {
      label: 'Aberto',
      bg: 'hsl(202 78% 36% / 0.1)',
      fg: 'hsl(202 78% 30%)',
    },
  },
  {
    name: 'Squash Open',
    meta: 'Início 19 mai · em breve',
    badge: {
      label: 'Rascunho',
      bg: 'hsl(var(--muted))',
      fg: 'hsl(var(--muted-foreground))',
    },
  },
];

interface FeedItem {
  type: 'book' | 'cancel' | 'member' | 'tourney';
  who: string;
  body: React.ReactNode;
  when: string;
}

const FEED: FeedItem[] = [
  {
    type: 'book',
    who: 'Marina S.',
    body: (
      <>
        reservou <b>Quadra 4</b> · Tennis · 19:00
      </>
    ),
    when: 'há 8 min',
  },
  {
    type: 'member',
    who: 'Bruno Castro',
    body: (
      <>
        entrou como sócio <b>Premium</b>
      </>
    ),
    when: 'há 22 min',
  },
  {
    type: 'cancel',
    who: 'Pedro Almeida',
    body: (
      <>
        cancelou <b>Quadra 7</b> · Padel · 21:00
      </>
    ),
    when: 'há 41 min',
  },
  {
    type: 'tourney',
    who: 'Juliana L.',
    body: (
      <>
        em <b>Copa Outono</b>
      </>
    ),
    when: 'há 1h 12min',
  },
  {
    type: 'book',
    who: 'Rodrigo P.',
    body: (
      <>
        reservou <b>Quadra 2</b> · Tennis · 07:00
      </>
    ),
    when: 'há 1h 35min',
  },
  {
    type: 'member',
    who: 'Fernanda T.',
    body: <>renovou matrícula · plano anual</>,
    when: 'há 2h',
  },
  {
    type: 'book',
    who: 'Ana Beatriz',
    body: (
      <>
        reservou <b>Arena Areia 3</b> · Beach · 17:00
      </>
    ),
    when: 'há 2h 18min',
  },
  {
    type: 'cancel',
    who: 'Lucas Aragão',
    body: (
      <>
        cancelou <b>Quadra 1</b> · Tennis · 18:00
      </>
    ),
    when: 'há 3h',
  },
];

function todayHeader(): string {
  const now = new Date();
  const dia = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Capitalize day-of-week
  const cap = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${cap} · ${hora}`;
}

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Klub Carioca de Tênis"
        subtitle={todayHeader()}
        activeSport="Tennis"
      />
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
            <ul className="flex flex-col">
              {TOURNAMENTS.map((t, i) => (
                <li
                  key={t.name}
                  className={cn(
                    'grid grid-cols-[1fr_auto] items-start gap-2 py-3',
                    i === 0 && 'pt-0',
                    i < TOURNAMENTS.length - 1 && 'border-b border-border',
                  )}
                >
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[13.5px] font-semibold leading-tight">
                      {t.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t.meta}
                    </p>
                    {t.progress !== undefined ? (
                      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${t.progress}%`,
                            background:
                              t.progressColor === 'accent'
                                ? 'hsl(var(--brand-accent-500))'
                                : t.progressColor === 'sky'
                                  ? 'hsl(202 78% 36%)'
                                  : 'hsl(var(--primary))',
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <span
                    className="inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[9.5px] font-bold uppercase tracking-[0.08em]"
                    style={{ background: t.badge.bg, color: t.badge.fg }}
                  >
                    {t.badge.label}
                  </span>
                </li>
              ))}
            </ul>
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
            <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
              {[FEED.slice(0, 4), FEED.slice(4, 8)].map((column, idx) => (
                <ul key={idx} className="flex flex-col">
                  {column.map((item, i) => (
                    <li
                      key={`${idx}-${i}`}
                      className={cn(
                        'flex gap-3 py-3 text-[13px]',
                        i < column.length - 1 && 'border-b border-border',
                      )}
                    >
                      <FeedIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p>
                          <span className="font-semibold">{item.who}</span> {item.body}
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                          {item.when}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </Panel>
        </section>
      </main>
    </>
  );
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
  // tourney
  return (
    <span
      className={cls}
      style={{ background: 'hsl(var(--brand-primary-700) / 0.08)', color: 'hsl(var(--brand-primary-700))' }}
    >
      <Trophy className={inner} strokeWidth={2} />
    </span>
  );
}
