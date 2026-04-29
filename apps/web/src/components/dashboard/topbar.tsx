'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listPendingMatchConfirmations } from '@/lib/api/rankings';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

interface TopbarProps {
  /** Subtítulo (geralmente data/hora). Aparece sob o nome do Klub. */
  subtitle?: string;
}

/**
 * Topbar contextual de páginas Klub-scoped. Mostra nome do Klub ativo,
 * subtítulo, sport tabs reais (vindas de `klub.sports`) e Bell com
 * contagem de partidas aguardando confirmação.
 */
export function Topbar({ subtitle }: TopbarProps) {
  const { klub, slug } = useActiveKlub();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    listPendingMatchConfirmations()
      .then((rows) => {
        if (!cancelled) setPendingCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sports = klub?.sports ?? [];
  const activeSport = React.useMemo(() => {
    const m = /^\/k\/[^/]+\/sports\/([^/]+)/.exec(pathname);
    return m ? (m[1] ?? null) : null;
  }, [pathname]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:gap-6 md:px-8">
      <div className="flex min-w-0 flex-1 flex-col md:flex-none">
        <h1 className="truncate font-display text-lg font-bold leading-none tracking-tight md:text-[20px]">
          {klub?.name ?? 'Klub'}
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {subtitle ?? `/k/${slug}`}
        </p>
      </div>

      {sports.length > 0 ? (
        <nav
          className="hidden rounded-md border border-border bg-card p-0.5 md:inline-flex"
          aria-label="Modalidades do Klub"
        >
          {sports.map((code) => {
            const isOn = code === activeSport;
            const label = SPORT_LABELS[code] ?? code;
            return (
              <Link
                key={code}
                href={`/k/${slug}/sports/${code}/dashboard`}
                aria-current={isOn ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isOn
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/notificacoes"
          aria-label={
            pendingCount && pendingCount > 0
              ? `Notificações (${pendingCount} aguardando confirmação)`
              : 'Notificações'
          }
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Bell className="size-4" />
          {pendingCount && pendingCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-card">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
