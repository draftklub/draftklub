import { LoadingState } from '@/components/ui/loading-state';

/**
 * Sprint M batch SM-5 — loading boundary do (authed).
 * Renderizado durante navegação client-side enquanto o page.tsx (Server
 * Component ou client com Suspense) ainda está pegando dados.
 */
export default function AuthedLoading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <LoadingState label="Carregando…" />
    </main>
  );
}
