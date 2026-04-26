'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

interface NavItem {
  href: `/dashboard${string}` | '/dashboard';
  label: string;
  icon: typeof Home;
  count?: number;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Visão geral', icon: Home },
  { href: '/dashboard/bookings', label: 'Reservas', icon: CalendarDays, count: 24 },
  { href: '/dashboard/courts', label: 'Quadras', icon: Building2 },
  { href: '/dashboard/tournaments', label: 'Torneios', icon: Trophy, count: 3 },
  { href: '/dashboard/players', label: 'Sócios', icon: Users },
  { href: '/dashboard/rankings', label: 'Ranking', icon: BarChart3 },
];

const MANAGEMENT_NAV: NavItem[] = [
  { href: '/dashboard/finance', label: 'Financeiro', icon: DollarSign },
  { href: '/dashboard/reports', label: 'Relatórios', icon: Activity },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Brand row */}
      <div className="mx-3.5 mb-3 flex items-center gap-2.5 border-b border-border px-2 pb-4 pt-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandLockup size="sm" />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-3.5 pb-2">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* Group: Gestão */}
      <p className="mt-2 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Gestão
      </p>
      <nav className="flex flex-col gap-0.5 px-3.5">
        {MANAGEMENT_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      {/* Footer card */}
      <div className="mx-3.5 mb-4 mt-auto rounded-[10px] bg-muted p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[30px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
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

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-[11px] rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
        active
          ? 'bg-primary/10 font-semibold text-[hsl(var(--brand-primary-600))]'
          : 'font-medium text-foreground hover:bg-muted',
      )}
    >
      <Icon
        className={cn(
          'size-[17px] shrink-0',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
        strokeWidth={1.8}
      />
      <span className="flex-1">{item.label}</span>
      {item.count !== undefined ? (
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}
