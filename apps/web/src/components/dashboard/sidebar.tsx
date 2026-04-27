'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  DollarSign,
  Home,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { cn } from '@/lib/utils';

type IconType = typeof Home;

interface NavSpec {
  /** Segmento da URL relativo a `/k/:slug/`. `'dashboard'` é a visão geral. */
  segment:
    | 'dashboard'
    | 'bookings'
    | 'courts'
    | 'tournaments'
    | 'players'
    | 'rankings'
    | 'modalidades'
    | 'finance'
    | 'reports'
    | 'settings';
  label: string;
  icon: IconType;
  count?: number;
}

const PRIMARY_NAV: NavSpec[] = [
  { segment: 'dashboard', label: 'Visão geral', icon: Home },
  { segment: 'bookings', label: 'Reservas', icon: CalendarDays, count: 24 },
  { segment: 'courts', label: 'Quadras', icon: Building2 },
  { segment: 'tournaments', label: 'Torneios', icon: Trophy, count: 3 },
  { segment: 'modalidades', label: 'Modalidades', icon: BarChart3 },
  { segment: 'players', label: 'Sócios', icon: Users },
  { segment: 'rankings', label: 'Ranking', icon: BarChart3 },
];

const MANAGEMENT_NAV: NavSpec[] = [
  { segment: 'finance', label: 'Financeiro', icon: DollarSign },
  { segment: 'reports', label: 'Relatórios', icon: Activity },
  { segment: 'settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ klubSlug?: string }>();
  const slug = params.klubSlug;

  const buildHref = (segment: NavSpec['segment']) => {
    if (!slug) return '#';
    return `/k/${slug}/${segment}`;
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Brand row */}
      <div className="mx-3.5 mb-3 flex items-center gap-2.5 border-b border-border px-2 pb-4 pt-5">
        <Link href={buildHref('dashboard')} className="flex items-center gap-2.5">
          <BrandLockup size="sm" />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-3.5 pb-2">
        {PRIMARY_NAV.map((item) => {
          const href = buildHref(item.segment);
          return (
            <NavLink
              key={item.segment}
              href={href}
              label={item.label}
              icon={item.icon}
              count={item.count}
              active={isActive(pathname, href, item.segment === 'dashboard')}
            />
          );
        })}
      </nav>

      {/* Group: Gestão */}
      <p className="mt-2 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Gestão
      </p>
      <nav className="flex flex-col gap-0.5 px-3.5">
        {MANAGEMENT_NAV.map((item) => {
          const href = buildHref(item.segment);
          return (
            <NavLink
              key={item.segment}
              href={href}
              label={item.label}
              icon={item.icon}
              count={item.count}
              active={isActive(pathname, href, false)}
            />
          );
        })}
      </nav>

      {/* Footer card */}
      <div className="mx-3.5 mb-4 mt-auto rounded-[10px] bg-muted p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7.5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            JP
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold leading-tight">João Pereira</p>
            <p className="truncate text-[10.5px] text-muted-foreground">Klub Admin · CTV</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function isActive(pathname: string, href: string, isOverview: boolean): boolean {
  if (href === '#') return false;
  // Visão geral só ativa no path exato pra não capturar irmãos.
  if (isOverview) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  count,
  active,
}: {
  href: string;
  label: string;
  icon: IconType;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.75 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
        active
          ? 'bg-primary/10 font-semibold text-[hsl(var(--brand-primary-600))]'
          : 'font-medium text-foreground hover:bg-muted',
      )}
    >
      <Icon
        className={cn('size-4.25 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
        strokeWidth={1.8}
      />
      <span className="flex-1">{label}</span>
      {count !== undefined ? (
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">{count}</span>
      ) : null}
    </Link>
  );
}
