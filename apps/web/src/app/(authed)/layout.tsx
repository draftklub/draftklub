import { AuthGuard } from '@/components/auth-guard';
import { AppShell } from '@/components/shell/app-shell';

/**
 * Layout do shell autenticado. Wraps todas rotas dentro do route group
 * `(authed)`. Sidebar persistente + drawer mobile.
 *
 * Rotas atualmente sob `(authed)`:
 * - `/home` (PR-A1)
 *
 * PR-A2 vai migrar `/k/[klubSlug]/...`, `/escolher-klub`, `/criar-klub`,
 * `/buscar-klubs`.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
