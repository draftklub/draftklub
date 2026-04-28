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
  ListOrdered,
  LogOut,
  Loader2,
  Shield,
  Trophy,
  X,
} from 'lucide-react';
import type {
  PlayerSportEnrollment,
  UserKlubMembership,
  Role,
} from '@draftklub/shared-types';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { useAuth } from '@/components/auth-provider';
import { listMyEnrollments } from '@/lib/api/enrollments';
import { getMe, getMyKlubs } from '@/lib/api/me';
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
  /** Em mobile, controla visibilidade do drawer. */
  open: boolean;
  /** Callback pra fechar o drawer (mobile). */
  onClose: () => void;
}

/**
 * Sidebar persistente do shell autenticado. Sempre visível em md+,
 * vira drawer em mobile.
 *
 * Sprint Polish PR-H1 — reorganização:
 * - Você: Home, Reservas, Klubs, Torneios (em breve), Rankings (em breve)
 * - Seus Klubs: só nomes (Nome usual quando preenchido)
 * - Footer: avatar (clicável → perfil), notif, theme, logout
 *
 * `Criar Klub` e `Buscar Klubs` saem da sidebar e moram dentro de /klubs
 * (PR-H2). Convites removido (defer). Perfil duplicado removido — só
 * via avatar do footer.
 */
export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
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
    void getMe()
      .then((me) => {
        if (cancelled) return;
        setIsSuperAdmin(me.roleAssignments.some((r) => r.role === 'SUPER_ADMIN'));
      })
      .catch(() => null);
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

  /** Map de "klubId:sportCode" → status do user (active|pending|suspended|none). */
  const enrollmentStatusByKey = React.useMemo(() => {
    const map = new Map<string, SportEnrollmentStatus>();
    for (const e of enrollments) {
      const profile = e.klubSportProfile;
      if (!profile) continue;
      const key = `${profile.klubId}:${profile.sportCode}`;
      // Prioridade: active > pending > suspended (mais recente vence em empate).
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

  // Match Klub ativo pelo pathname /k/[slug]/...
  const activeKlubSlug = React.useMemo(() => {
    const m = /^\/k\/([^/]+)/.exec(pathname);
    return m ? m[1] : null;
  }, [pathname]);

  async function handleLogout() {
    forgetLastKlubSlug();
    await logout();
    router.replace('/login');
  }

  return (
    <>
      {/* Backdrop mobile */}
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
        <div className="flex items-center justify-between gap-2.5 border-b border-border px-5 pb-3 pt-4">
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

        {/* Você */}
        <SectionLabel>Você</SectionLabel>
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
          <NavLink
            href="/klubs"
            label="Klubs"
            icon={Castle}
            active={pathname === '/klubs' || pathname === '/criar-klub' || pathname === '/buscar-klubs'}
            onNavigate={onClose}
          />
          <NavLink href="#" label="Notificações" icon={Bell} disabled badge="em breve" />
          <NavLink href="#" label="Torneios" icon={Trophy} disabled badge="em breve" />
          <NavLink href="#" label="Rankings" icon={ListOrdered} disabled badge="em breve" />
        </nav>

        {/* Seus Klubs — só nomes, sem botões de criar/buscar (movidos pra /klubs). */}
        <SectionLabel>Seus Klubs</SectionLabel>
        <nav className="flex flex-col gap-0.5 px-3">
          {klubs === null ? (
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Carregando…
            </div>
          ) : klubs.length === 0 ? (
            <p className="px-2.5 py-2 text-[12px] text-muted-foreground">
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
                active={activeKlubSlug === k.klubSlug}
                pathname={pathname}
                enrollmentStatusByKey={enrollmentStatusByKey}
                onNavigate={onClose}
              />
            ))
          )}
        </nav>

        {/* Administrativa — só SUPER_ADMIN. Sprint Polish PR-I1. */}
        {isSuperAdmin ? (
          <>
            <SectionLabel>Administrativa</SectionLabel>
            <nav className="flex flex-col gap-0.5 px-3">
              <NavLink
                href="/admin/aprovacoes"
                label="Aprovações"
                icon={Shield}
                active={pathname.startsWith('/admin/aprovacoes') || pathname.startsWith('/admin/cadastros')}
                onNavigate={onClose}
              />
            </nav>
          </>
        ) : null}

        {/* Footer */}
        <div className="mt-auto border-t border-border p-3">
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
              <p className="truncate text-[13px] font-semibold leading-tight">
                {user?.displayName ?? user?.email?.split('@')[0] ?? 'Você'}
              </p>
              {user?.email ? (
                <p className="truncate text-[10.5px] text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

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
    'flex items-center gap-2.75 rounded-lg px-2.5 py-1.75 text-[13.5px] transition-colors',
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
        <span className="rounded-full bg-muted px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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

/**
 * Sprint Polish PR-H3 — item de Klub na sidebar com submenu colapsável
 * de modalidades. Click no nome navega pro dashboard E expande o
 * submenu. Cada modalidade mostra status de enrollment do user:
 * - active → link pro sport dashboard
 * - pending → tag "pendente" disabled
 * - suspended → tag "suspenso" disabled
 * - none → link pro request enrollment page
 */
function KlubItem({
  klub,
  active,
  pathname,
  enrollmentStatusByKey,
  onNavigate,
}: {
  klub: UserKlubMembership;
  active: boolean;
  pathname: string;
  enrollmentStatusByKey: Map<string, SportEnrollmentStatus>;
  onNavigate?: () => void;
}) {
  const label = klub.klubCommonName ?? klub.klubName;
  const sports = klub.sports ?? [];
  // Klub ativo começa expandido. Outros user expande manualmente.
  const [expanded, setExpanded] = React.useState(active);
  React.useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  const hasSports = sports.length > 0;
  const ChevIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg pr-1 transition-colors',
          active
            ? 'bg-primary/10 text-[hsl(var(--brand-primary-600))]'
            : 'text-foreground hover:bg-muted',
        )}
      >
        <Link
          href={`/k/${klub.klubSlug}/dashboard`}
          onClick={onNavigate}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.75 text-[13.5px]',
            active ? 'font-semibold' : 'font-medium',
          )}
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
                pathname={pathname}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SportLink({
  klubSlug,
  klubId,
  sportCode,
  status,
  pathname,
  onNavigate,
}: {
  klubSlug: string;
  klubId: string;
  sportCode: string;
  status: SportEnrollmentStatus;
  pathname: string;
  onNavigate?: () => void;
}) {
  void klubId;
  const label = SPORT_LABELS[sportCode] ?? sportCode;
  const dashboardHref = `/k/${klubSlug}/sports/${sportCode}/dashboard`;
  const enrollHref = `/k/${klubSlug}/sports/${sportCode}/enroll`;
  const href = status === 'active' ? dashboardHref : status === 'none' ? enrollHref : null;
  const isActive =
    pathname === dashboardHref || pathname === enrollHref || pathname.startsWith(dashboardHref);

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
        <span className="text-[10px] text-muted-foreground">solicitar</span>
      ) : null}
    </span>
  );

  const cls = cn(
    'flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px] transition-colors',
    isActive
      ? 'bg-primary/10 font-semibold text-[hsl(var(--brand-primary-600))]'
      : status === 'active'
        ? 'font-medium text-foreground hover:bg-muted'
        : 'text-muted-foreground hover:bg-muted',
  );

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

function KlubAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'K';
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const dim = size === 'sm' ? 'size-6 text-[11px]' : 'size-10 text-base';
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
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function RoleDot({ role }: { role: Role }) {
  const isAdmin = role === 'KLUB_ADMIN' || role === 'SUPER_ADMIN';
  if (!isAdmin) return null;
  return <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Admin" />;
}
