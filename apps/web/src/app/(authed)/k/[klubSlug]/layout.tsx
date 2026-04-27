import { ActiveKlubProvider } from '@/components/active-klub-provider';
import { ActiveKlubGate } from '@/components/active-klub-gate';
import { PersonaSwitcher } from '@/components/dashboard/persona-switcher';

/**
 * Layout Klub-scoped. AuthGuard + AppShell vêm do `(authed)/layout.tsx`
 * superior. Aqui só envolve com `ActiveKlubProvider` (resolve Klub via
 * `[klubSlug]`) + `ActiveKlubGate` (UI de loading/erro). Sidebar
 * persistente cuida da navegação inter-Klubs; nenhuma sidebar adicional
 * aqui.
 */
export default function KlubScopedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveKlubProvider>
      <ActiveKlubGate>{children}</ActiveKlubGate>
      <PersonaSwitcher />
    </ActiveKlubProvider>
  );
}
