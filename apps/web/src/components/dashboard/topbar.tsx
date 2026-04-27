'use client';

import { Bell, Search } from 'lucide-react';
import { useActiveKlub } from '@/components/active-klub-provider';
import { cn } from '@/lib/utils';

const SPORTS = ['Tennis', 'Padel', 'Squash', 'Beach'] as const;
type Sport = (typeof SPORTS)[number];

interface TopbarProps {
  /** Subtítulo (geralmente data/hora). Aparece sob o nome do Klub. */
  subtitle?: string;
  activeSport?: Sport;
}

/**
 * Topbar contextual de páginas Klub-scoped. Mostra nome do Klub ativo
 * (estático — sidebar persistente cuida de troca/navegação),
 * subtítulo, sport tabs e ações: notificações, search.
 *
 * Theme toggle e logout vivem na sidebar persistente (PR-A7).
 *
 * Mobile polish (PR2b): sport tabs aparecem em md+ (não mais só em
 * lg+); search vira ícone clicável em <md em vez de sumir.
 */
export function Topbar({ subtitle, activeSport = 'Tennis' }: TopbarProps) {
  const { klub, slug } = useActiveKlub();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:gap-6 md:px-8">
      <div className="flex min-w-0 flex-1 flex-col md:flex-none">
        <h1
          className="truncate font-display text-[18px] font-bold leading-none md:text-[20px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {klub?.name ?? 'Klub'}
        </h1>
        <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
          {subtitle ?? `/k/${slug}`}
        </p>
      </div>

      <div className="hidden rounded-[9px] border border-border bg-card p-0.75 md:inline-flex">
        {SPORTS.map((sport) => {
          const isOn = sport === activeSport;
          return (
            <button
              key={sport}
              type="button"
              aria-pressed={isOn}
              className={cn(
                'h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                isOn
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {sport}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block md:w-60">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar sócio, quadra…"
            className="h-9 w-full rounded-[9px] border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        {/* Search icon-only em mobile (não tem busca funcional ainda;
            placeholder pra UX consistente). */}
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
          aria-label="Buscar"
        >
          <Search className="size-4" />
        </button>

        <button
          type="button"
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent ring-2 ring-card"
          />
        </button>
      </div>
    </header>
  );
}
