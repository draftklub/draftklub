'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { AppSidebar } from '@/components/shell/app-sidebar';

/**
 * Shell autenticado: sidebar persistente + área de conteúdo.
 *
 * - Desktop (md+): sidebar fixa à esquerda, conteúdo flui à direita
 * - Mobile: sidebar é drawer; topbar mobile com hamburger + brand
 *
 * Cada page autenticada renderiza só seu conteúdo; topbar específica
 * (ex.: do Klub) vive dentro do conteúdo, complementar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background md:h-screen md:overflow-hidden">
      <AppSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        {/* Topbar mobile (hamburger). Em md+, sidebar dá tudo. */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <BrandLockup size="sm" />
        </header>

        {children}
      </div>
    </div>
  );
}
