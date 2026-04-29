'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarCheck, Castle, Home, ListOrdered, LogOut, X } from 'lucide-react';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { useAuth } from '@/components/auth-provider';
import { getMyKlubs } from '@/lib/api/me';
import { logout } from '@/lib/auth';
import { forgetLastKlubSlug } from '@/lib/last-klub-cookie';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMyKlubs()
      .then((data) => {
        if (!cancelled) setKlubs(data);
      })
      .catch(() => {
        if (!cancelled) setKlubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeKlubSlug = React.useMemo(() => {
    const m = /^\/k\/([^/]+)/.exec(pathname);
    return m ? (m[1] ?? null) : null;
  }, [pathname]);

  const activeSport = React.useMemo(() => {
    const m = /^\/k\/[^/]+\/sports\/([^/]+)/.exec(pathname);
    return m ? (m[1] ?? null) : null;
  }, [pathname]);

  const rankingsHref = React.useMemo(() => {
    if (activeKlubSlug) {
      const sport = activeSport ?? 'tennis';
      return `/k/${activeKlubSlug}/sports/${sport}/rankings`;
    }
    const first = klubs?.[0];
    if (first) {
      return `/k/${first.klubSlug}/sports/${first.sports?.[0] ?? 'tennis'}/rankings`;
    }
    return '#';
  }, [activeKlubSlug, activeSport, klubs]);

  async function handleLogout() {
    forgetLastKlubSlug();
    await logout();
    router.replace('/login');
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-card transition-transform',
          'md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand row */}
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border px-5 pb-3 pt-4">
          <Link href="/home" className="flex items-center gap-2.5" onClick={onClose}>
            <BrandLockup size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3">
          <nav className="flex flex-col gap-0.5 px-3">
            <NavLink
              href="/home"
              label="Home"
              icon={Home}
              active={pathname === '/home'}
              onNavigate={onClose}
            />
            <NavLink
              href="/minhas-reservas"
              label="Reservas"
              icon={CalendarCheck}
              active={pathname === '/minhas-reservas'}
              onNavigate={onClose}
            />
            <NavLink
              href="/klubs"
              label="Klubs"
              icon={Castle}
              active={
                pathname === '/klubs' ||
                pathname === '/criar-klub' ||
                pathname === '/buscar-klubs' ||
                (activeKlubSlug !== null && !pathname.includes('/rankings'))
              }
              onNavigate={onClose}
            />
            <NavLink
              href={rankingsHref}
              label="Rankings"
              icon={ListOrdered}
              active={pathname.includes('/rankings')}
              disabled={rankingsHref === '#'}
              onNavigate={onClose}
            />
            <NavLink
              href="/notificacoes"
              label="Notificações"
              icon={Bell}
              active={pathname.startsWith('/notificacoes')}
              onNavigate={onClose}
            />
          </nav>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3">
          <Link
            href="/perfil"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted',
              pathname === '/perfil' && 'bg-primary/10',
            )}
          >
            <Avatar
              name={user?.displayName ?? user?.email ?? '?'}
              photoUrl={user?.photoURL ?? null}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {user?.displayName ?? user?.email?.split('@')[0] ?? 'Você'}
              </p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  label: string;
  icon: typeof Home;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  onNavigate?: () => void;
}

function NavLink({ href, label, icon: Icon, active, disabled, badge, onNavigate }: NavLinkProps) {
  const cls = cn(
    'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
    active
      ? 'bg-primary/10 font-semibold text-brand-primary-600'
      : 'font-medium text-foreground hover:bg-muted',
    disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
  );

  const content = (
    <>
      <Icon
        className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
        strokeWidth={1.8}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span className={cls} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={cls} onClick={onNavigate}>
      {content}
    </Link>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (photoUrl) {
    return (
      <span className="flex size-8 shrink-0 overflow-hidden rounded-full" aria-hidden="true">
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
