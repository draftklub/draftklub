'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — tab nav padronizada.
 *
 * Substitui 8+ implementações ad-hoc (configurar, torneios/[id], perfil,
 * etc) com visual ligeiramente diferente cada uma.
 *
 * Suporta 2 modos:
 *
 * 1. **Search-param mode** (`mode='searchParam'`) — atual default em
 *    `/configurar` etc. Tab muda só o `?tab=` na URL via router.replace
 *    (não navega). Bom pra forms onde state local importa.
 *
 * 2. **Link mode** (`mode='link'`) — cada tab é uma sub-rota real
 *    (`/torneios/:id/chave`, `/torneios/:id/operacoes`). Best fit pra
 *    páginas grandes que serão split em sub-páginas no PR-L2.
 *
 * Ambos os modos usam <a>/Link semanticamente, suportam middle-click +
 * cmd-click no link mode, mantêm estado consistent.
 */

export interface Tab {
  id: string;
  label: React.ReactNode;
  /** Link mode only — href absoluto ou relativo. */
  href?: string;
  /** Esconde tab (mantém ID estável pra outros consumers). */
  hidden?: boolean;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  /** Active tab id. Em searchParam mode: deduz se omitido. Em link mode:
   *  se omitido, usa pathname comparison. */
  active?: string;
  /** Em searchParam mode: callback quando tab muda. Default troca ?tab=. */
  onChange?: (id: string) => void;
  /** Mode de navegação. */
  mode?: 'searchParam' | 'link';
  /** Param name pra search mode. Default 'tab'. */
  paramName?: string;
  className?: string;
}

export function Tabs({
  tabs,
  active,
  onChange,
  mode = 'searchParam',
  paramName = 'tab',
  className,
}: TabsProps) {
  const visibleTabs = tabs.filter((t) => !t.hidden);

  return (
    <nav className={cn('-mx-4 overflow-x-auto border-b border-border md:mx-0', className)}>
      <ul className="flex min-w-max gap-1 px-4 md:px-0">
        {visibleTabs.map((tab) => (
          <li key={tab.id}>
            {mode === 'link' && tab.href ? (
              <LinkTab tab={tab} active={active === tab.id} />
            ) : (
              <SearchParamTab
                tab={tab}
                active={active === tab.id}
                paramName={paramName}
                onChange={onChange}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabContent({
  active,
  badge,
  children,
}: {
  active: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex h-10 items-center gap-1.5 px-3 text-sm font-medium transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {badge ? <span className="ml-0.5">{badge}</span> : null}
      {active ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t-full bg-primary" />
      ) : null}
    </span>
  );
}

function LinkTab({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link href={tab.href ?? '#'} className="block">
      <TabContent active={active} badge={tab.badge}>
        {tab.label}
      </TabContent>
    </Link>
  );
}

function SearchParamTab({
  tab,
  active,
  paramName,
  onChange,
}: {
  tab: Tab;
  active: boolean;
  paramName: string;
  onChange?: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick() {
    if (onChange) {
      onChange(tab.id);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, tab.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <button type="button" onClick={handleClick} className="block">
      <TabContent active={active} badge={tab.badge}>
        {tab.label}
      </TabContent>
    </button>
  );
}
