'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Home,
  Plus,
  Search,
  Mail,
  LogOut,
  Loader2,
  Moon,
  Shield,
  Sparkles,
  Sun,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import type { UserKlubMembership, Role } from '@draftklub/shared-types';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { getMe, getMyKlubs } from '@/lib/api/me';
import { logout } from '@/lib/auth';
import { forgetLastKlubSlug } from '@/lib/last-klub-cookie';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  /** Em mobile, controla visibilidade do drawer. */
  open: boolean;
  /** Callback pra fechar o drawer (mobile). */
  onClose: () => void;
}

/**
 * Sidebar persistente do shell autenticado. Sempre visível em md+,
 * vira drawer em mobile. Estrutura:
 *
 * - Brand
 * - Você: Home
 * - Seus Klubs: lista de memberships + Criar/Buscar/Convites
 * - Footer: avatar + email + logout
 *
 * Highlight do item ativo via pathname matching. Lista de Klubs
 * busca via `getMyKlubs` no mount; cache em estado local (Onda 2
 * pode promover pra Context se ficar pesado).
 */
export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="flex items-center justify-between gap-2.5 border-b border-border px-5 pb-4 pt-5">
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
        <nav className="flex flex-col gap-0.5 px-3 pb-2">
          <NavLink
            href="/home"
            label="Home"
            icon={Home}
            active={pathname === '/home'}
            onNavigate={onClose}
          />
          <NavLink
            href="/perfil"
            label="Perfil"
            icon={User}
            active={pathname === '/perfil'}
            onNavigate={onClose}
          />
        </nav>

        {/* Seus Klubs */}
        <SectionLabel>Seus Klubs</SectionLabel>
        <nav className="flex flex-col gap-0.5 px-3">
          {klubs === null ? (
            <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Carregando…
            </div>
          ) : klubs.length === 0 ? (
            <p className="px-2.5 py-2 text-[12px] text-muted-foreground">Nenhum Klub ainda.</p>
          ) : (
            klubs.map((k) => (
              <KlubLink
                key={k.klubId}
                klub={k}
                active={activeKlubSlug === k.klubSlug}
                onNavigate={onClose}
              />
            ))
          )}
          <NavLink
            href="/criar-klub"
            label="Criar Klub"
            icon={Plus}
            active={pathname === '/criar-klub'}
            onNavigate={onClose}
          />
          <NavLink
            href="/buscar-klubs"
            label="Buscar Klubs"
            icon={Search}
            active={pathname === '/buscar-klubs'}
            onNavigate={onClose}
          />
          <NavLink href="#" label="Convites" icon={Mail} disabled badge="em breve" />
          {isSuperAdmin ? (
            <NavLink
              href="/admin/cadastros"
              label="Cadastros"
              icon={Shield}
              active={pathname.startsWith('/admin/cadastros')}
              onNavigate={onClose}
            />
          ) : null}
        </nav>

        {/* Klub atual — atalhos do Klub ativo. Reservar é pra qualquer
            member; Admin do Klub vê config + solicitações. */}
        {(() => {
          if (!activeKlubSlug) return null;
          const activeKlub = klubs?.find((k) => k.klubSlug === activeKlubSlug);
          if (!activeKlub) return null;
          const isAdmin = activeKlub.role === 'KLUB_ADMIN';
          return (
            <>
              <SectionLabel>{activeKlub.klubName}</SectionLabel>
              <nav className="flex flex-col gap-0.5 px-3">
                <NavLink
                  href={`/k/${activeKlubSlug}/reservar`}
                  label="Reservar quadra"
                  icon={CalendarDays}
                  active={pathname === `/k/${activeKlubSlug}/reservar`}
                  onNavigate={onClose}
                />
                {isAdmin ? (
                  <>
                    <NavLink
                      href={`/k/${activeKlubSlug}/onboarding`}
                      label="Configurar Klub"
                      icon={Sparkles}
                      active={pathname === `/k/${activeKlubSlug}/onboarding`}
                      onNavigate={onClose}
                    />
                    <NavLink
                      href={`/k/${activeKlubSlug}/solicitacoes`}
                      label="Solicitações"
                      icon={UserCheck}
                      active={pathname === `/k/${activeKlubSlug}/solicitacoes`}
                      onNavigate={onClose}
                    />
                  </>
                ) : null}
              </nav>
            </>
          );
        })()}

        {/* Footer */}
        <div className="mt-auto border-t border-border p-3">
          <Link
            href="/perfil"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
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
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={
                resolvedTheme === 'dark' ? 'Mudar pra tema claro' : 'Mudar pra tema escuro'
              }
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
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
    'flex items-center gap-2.75 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
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

function KlubLink({
  klub,
  active,
  onNavigate,
}: {
  klub: UserKlubMembership;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/k/${klub.klubSlug}/dashboard`}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.75 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
        active
          ? 'bg-primary/10 font-semibold text-[hsl(var(--brand-primary-600))]'
          : 'font-medium text-foreground hover:bg-muted',
      )}
    >
      <KlubAvatar name={klub.klubName} size="sm" />
      <span className="min-w-0 flex-1 truncate">{klub.klubName}</span>
      {klub.role ? <RoleDot role={klub.role} /> : null}
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
