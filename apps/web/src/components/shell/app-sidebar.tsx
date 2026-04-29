'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  Castle,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Loader2,
  X,
} from 'lucide-react';
import type { PlayerSportEnrollment, UserKlubMembership, Role } from '@draftklub/shared-types';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { useAuth } from '@/components/auth-provider';
import { listMyEnrollments } from '@/lib/api/enrollments';
import { getMyKlubs } from '@/lib/api/me';
import { logout } from '@/lib/auth';
import { forgetLastKlubSlug } from '@/lib/last-klub-cookie';
import { cn } from '@/lib/utils';

type EnrollmentWithProfile = PlayerSportEnrollment & {
  klubSportProfile?: { klubId: string; sportCode: string; name: string };
};

type SportEnrollmentStatus = 'active' | 'pending' | 'suspended' | 'none';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [enrollments, setEnrollments] = React.useState<EnrollmentWithProfile[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    getMyKlubs()
      .then((data) => {
        if (!cancelled) setKlubs(data);
      })
      .catch(() => {
        if (!cancelled) setKlubs([]);
      });
    listMyEnrollments()
      .then((data) => {
        if (!cancelled) setEnrollments(data);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enrollmentStatusByKey = React.useMemo(() => {
    const map = new Map<string, SportEnrollmentStatus>();
    for (const e of enrollments) {
      const profile = e.klubSportProfile;
      if (!profile) continue;
      const key = `${profile.klubId}:${profile.sportCode}`;
      const current = map.get(key);
      const status: SportEnrollmentStatus =
        e.status === 'active'
          ? 'active'
          : e.status === 'pending'
            ? 'pending'
            : e.status === 'suspended'
              ? 'suspended'
              : 'none';
      if (
        !current ||
        (current === 'pending' && status === 'active') ||
        (current === 'suspended' && status !== 'suspended')
      ) {
        map.set(key, status);
      }
    }
    return map;
  }, [enrollments]);

  const activeKlubSlug = React.useMemo(() => {
    const m = /^\/k\/([^/]+)/.exec(pathname);
    return m ? (m[1] ?? null) : null;
  }, [pathname]);

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
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border px-4 pb-3.5 pt-4">
          <Link href="/home" className="flex items-center gap-2.5" onClick={onClose}>
            <BrandLockup size="lg" />
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

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Spacer — placeholder onde "Você" estava */}
          <div className="h-1" />

          <nav className="flex flex-col gap-0.5 px-3 pb-1.5">
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

            {/* Klubs — accordion com klubs inscritos */}
            <KlubsAccordion
              klubs={klubs}
              activeKlubSlug={activeKlubSlug}
              pathname={pathname}
              enrollmentStatusByKey={enrollmentStatusByKey}
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

// ─── KlubsAccordion ──────────────────────────────────────────────────────────

function KlubsAccordion({
  klubs,
  activeKlubSlug,
  pathname,
  enrollmentStatusByKey,
  onNavigate,
}: {
  klubs: UserKlubMembership[] | null;
  activeKlubSlug: string | null;
  pathname: string;
  enrollmentStatusByKey: Map<string, SportEnrollmentStatus>;
  onNavigate?: () => void;
}) {
  const [expanded, setExpanded] = React.useState(activeKlubSlug !== null);
  const isActive =
    pathname === '/klubs' || pathname === '/criar-klub' || pathname === '/buscar-klubs';
  const ChevIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg pr-1 transition-colors',
          isActive ? 'bg-primary/10' : 'hover:bg-muted',
        )}
      >
        <Link
          href="/klubs"
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.75 rounded-lg px-2.5 py-1.75 text-sm',
            isActive
              ? 'font-semibold text-[hsl(var(--brand-primary-600))]'
              : 'font-medium text-foreground',
          )}
        >
          <Castle
            className={cn(
              'size-4.25 shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
            strokeWidth={1.8}
          />
          <span className="flex-1 truncate">Klubs</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          aria-label={expanded ? 'Recolher Klubs' : 'Expandir Klubs'}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <ChevIcon className="size-3.5" />
        </button>
      </div>

      {expanded ? (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
          {klubs === null ? (
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Carregando…
            </div>
          ) : klubs.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Nenhum Klub ainda.{' '}
              <Link href="/klubs" className="font-semibold text-primary hover:underline">
                Buscar
              </Link>
            </p>
          ) : (
            klubs.map((k) => (
              <KlubItem
                key={k.klubId}
                klub={k}
                pathname={pathname}
                enrollmentStatusByKey={enrollmentStatusByKey}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── KlubItem ─────────────────────────────────────────────────────────────────

function KlubItem({
  klub,
  pathname,
  enrollmentStatusByKey,
  onNavigate,
}: {
  klub: UserKlubMembership;
  pathname: string;
  enrollmentStatusByKey: Map<string, SportEnrollmentStatus>;
  onNavigate?: () => void;
}) {
  const label = klub.klubCommonName ?? klub.klubName;
  const sports = klub.sports ?? [];
  const [expanded, setExpanded] = React.useState(false);
  const hasSports = sports.length > 0;
  const ChevIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <div className="flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-muted">
        <Link
          href={`/k/${klub.klubSlug}/dashboard`}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.75 text-sm font-medium"
        >
          <KlubAvatar name={label} size="sm" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {klub.role ? <RoleDot role={klub.role} /> : null}
        </Link>
        {hasSports ? (
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            aria-label={expanded ? 'Recolher modalidades' : 'Expandir modalidades'}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <ChevIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {expanded && hasSports ? (
        <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
          {sports.map((code) => (
            <li key={code}>
              <SportLink
                klubSlug={klub.klubSlug}
                klubId={klub.klubId}
                sportCode={code}
                status={enrollmentStatusByKey.get(`${klub.klubId}:${code}`) ?? 'none'}
                onNavigate={onNavigate}
              />
              {/* Torneios + Rankings sub-links */}
              <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                <SubLink
                  href={`/k/${klub.klubSlug}/sports/${code}/torneios`}
                  label="Torneios"
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
                <SubLink
                  href={`/k/${klub.klubSlug}/sports/${code}/rankings`}
                  label="Rankings"
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ─── SportLink ────────────────────────────────────────────────────────────────

function SportLink({
  klubSlug,
  klubId,
  sportCode,
  status,
  onNavigate,
}: {
  klubSlug: string;
  klubId: string;
  sportCode: string;
  status: SportEnrollmentStatus;
  onNavigate?: () => void;
}) {
  void klubId;
  const label = SPORT_LABELS[sportCode] ?? sportCode;
  const dashboardHref = `/k/${klubSlug}/sports/${sportCode}/dashboard`;
  const enrollHref = `/k/${klubSlug}/sports/${sportCode}/enroll`;
  const href = status === 'active' ? dashboardHref : status === 'none' ? enrollHref : null;

  const inner = (
    <span className="flex flex-1 items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      {status === 'pending' ? (
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
          pendente
        </span>
      ) : status === 'suspended' ? (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          suspenso
        </span>
      ) : status === 'none' ? (
        <span className="text-xs text-muted-foreground">solicitar</span>
      ) : null}
    </span>
  );

  const cls =
    'flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted';

  if (!href) {
    return (
      <span className={cn(cls, 'cursor-not-allowed opacity-70 hover:bg-transparent')}>{inner}</span>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className={cls}>
      {inner}
    </Link>
  );
}

// ─── SubLink (Torneios / Rankings) ────────────────────────────────────────────

function SubLink({
  href,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
        isActive
          ? 'font-semibold text-[hsl(var(--brand-primary-600))]'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </Link>
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
    'flex items-center gap-2.75 rounded-lg px-2.5 py-1.75 text-sm transition-colors',
    active
      ? 'bg-primary/10 font-semibold text-[hsl(var(--brand-primary-600))]'
      : 'font-medium text-foreground hover:bg-muted',
    disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
  );

  const content = (
    <>
      <Icon
        className={cn('size-4.25 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
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

// ─── KlubAvatar ───────────────────────────────────────────────────────────────

function KlubAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'K';
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const dim = size === 'sm' ? 'size-6 text-xs' : 'size-10 text-base';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md font-display font-bold text-white',
        dim,
      )}
      style={{ background: `hsl(${hue} 55% 42%)` }}
      aria-hidden="true"
    >
      {initial}
    </span>
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

// ─── RoleDot ──────────────────────────────────────────────────────────────────

function RoleDot({ role }: { role: Role }) {
  const isAdmin = role === 'KLUB_ADMIN' || role === 'PLATFORM_OWNER';
  if (!isAdmin) return null;
  return <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Admin" />;
}
