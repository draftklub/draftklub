'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Plus, Search } from 'lucide-react';
import type { UserKlubMembership, Role, KlubPlan } from '@draftklub/shared-types';
import { AuthGuard } from '@/components/auth-guard';
import { getMyKlubs } from '@/lib/api/me';
import { cn } from '@/lib/utils';

export default function EscolherKlubPage() {
  return (
    <AuthGuard>
      <PickerScreen />
    </AuthGuard>
  );
}

function PickerScreen() {
  const router = useRouter();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    setKlubs(null);
    getMyKlubs()
      .then((data) => {
        if (cancelled) return;
        setKlubs(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar Klubs');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // Atalho: 1 Klub → vai direto, evita picker desnecessário.
  React.useEffect(() => {
    if (klubs?.length === 1) {
      const only = klubs[0];
      if (only) router.replace(`/k/${only.klubSlug}/dashboard`);
    }
  }, [klubs, router]);

  const hasKlubs = klubs !== null && klubs.length > 0;

  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <h1
            className="font-display text-[28px] font-bold md:text-[34px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {hasKlubs ? 'Escolha um Klub' : 'Bora encontrar seu Klub'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            {hasKlubs
              ? 'Você participa de mais de um Klub. Clica pra entrar.'
              : 'Entre num Klub que já existe ou crie o seu.'}
          </p>
        </header>

        {error ? (
          <ErrorState message={error} onRetry={() => setReloadToken((n) => n + 1)} />
        ) : klubs === null ? (
          <SkeletonGrid />
        ) : klubs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {klubs.map((k) => (
                <li key={k.klubId}>
                  <KlubCard klub={k} />
                </li>
              ))}
            </ul>
            <CompactPaths />
          </>
        )}
      </div>
    </main>
  );
}

function KlubCard({ klub }: { klub: UserKlubMembership }) {
  return (
    <Link
      href={`/k/${klub.klubSlug}/dashboard`}
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <KlubAvatar name={klub.klubName} />
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-display text-[16px] font-bold leading-tight"
            style={{ letterSpacing: '-0.01em' }}
          >
            {klub.klubName}
          </h2>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            /{klub.klubSlug}
          </p>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {klub.role ? <RoleBadge role={klub.role} /> : null}
        <PlanBadge plan={klub.klubPlan} />
      </div>
    </Link>
  );
}

/**
 * Paths compactos pro user com N memberships: aparece abaixo do grid
 * de Klubs ativos, sem deslocar o foco principal. Mesmas 3 ações do
 * EmptyState mas em formato discreto (links secundários).
 */
function CompactPaths() {
  return (
    <div className="mt-10 border-t border-border pt-6">
      <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Outras opções
      </p>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <Link
          href="/buscar-klubs"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Search className="size-3.5 text-muted-foreground" />
          Procurar um Klub
        </Link>
        <Link
          href="/criar-klub"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-3.5 text-muted-foreground" />
          Criar meu Klub
        </Link>
      </div>
      <p className="mt-4 text-center text-[12px] text-muted-foreground">
        <Link
          href="/quero-criar-klub"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Sou dono de um clube e quero saber mais
        </Link>
      </p>
    </div>
  );
}

function KlubAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'K';
  // Hash simples pra pegar uma cor estável por nome.
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-base font-bold text-white"
      style={{ background: `hsl(${hue} 55% 42%)` }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  KLUB_ADMIN: 'Klub Admin',
  SPORTS_COMMITTEE: 'Comissão',
  STAFF: 'Staff',
  TEACHER: 'Professor',
  PLAYER: 'Jogador',
};

function RoleBadge({ role }: { role: Role }) {
  const isAdmin = role === 'KLUB_ADMIN' || role === 'SUPER_ADMIN';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        isAdmin
          ? 'bg-primary/10 text-[hsl(var(--brand-primary-600))]'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function PlanBadge({ plan }: { plan: KlubPlan }) {
  const isTrial = plan === 'trial';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        isTrial
          ? 'bg-[hsl(var(--brand-accent-500)/0.14)] text-[hsl(38_92%_28%)]'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {plan}
    </span>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-31 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </ul>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <h2 className="font-display text-base font-bold">Erro ao carregar Klubs</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Loader2 className="size-3.5" />
        Tentar de novo
      </button>
    </div>
  );
}

/**
 * Empty state pro user com 0 memberships. 3 caminhos:
 * - "Procurar um Klub" → discovery (placeholder por enquanto, /buscar-klubs)
 * - "Criar meu Klub" → self-service (/criar-klub)
 * - Link sutil "Sou dono de um clube..." → sales-led intake (/quero-criar-klub)
 */
function EmptyState() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 md:p-10">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:gap-3">
        <Link
          href="/buscar-klubs"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Search className="size-4" />
          Procurar um Klub
        </Link>
        <Link
          href="/criar-klub"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-transparent px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          Criar meu Klub
        </Link>
      </div>
      <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
        <Link
          href="/quero-criar-klub"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Sou dono de um clube e quero saber mais
        </Link>
      </p>
    </div>
  );
}
