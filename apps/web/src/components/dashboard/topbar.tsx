'use client';

import { useRouter } from 'next/navigation';
import { Bell, LogOut, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { logout } from '@/lib/auth';
import { cn } from '@/lib/utils';

const SPORTS = ['Tennis', 'Padel', 'Squash', 'Beach'] as const;
type Sport = (typeof SPORTS)[number];

interface TopbarProps {
  title: string;
  subtitle?: string;
  activeSport?: Sport;
}

export function Topbar({ title, subtitle, activeSport = 'Tennis' }: TopbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-border bg-card px-8">
      <div className="min-w-0">
        <h1
          className="truncate font-display text-[20px] font-bold"
          style={{ letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="hidden rounded-[9px] border border-border bg-card p-[3px] lg:inline-flex">
        {SPORTS.map((sport) => {
          const isOn = sport === activeSport;
          return (
            <button
              key={sport}
              type="button"
              className={cn(
                'h-7 rounded-md px-3 text-[12.5px] font-medium transition-colors',
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

      <div className="ml-auto flex items-center gap-2.5">
        <div className="relative hidden md:block md:w-[240px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar sócio, quadra…"
            className="h-[34px] w-full rounded-[9px] border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Alternar tema"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent ring-2 ring-card"
          />
        </button>

        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Sair"
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
