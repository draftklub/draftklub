'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { getMyKlubs } from '@/lib/api/me';

export default function PostLoginPage() {
  return (
    <AuthGuard>
      <PostLoginRouter />
    </AuthGuard>
  );
}

/**
 * Roteador pós-login: chama `GET /me/klubs` e redireciona conforme o
 * número de Klubs do user:
 * - 0 → `/criar-klub` (vazio: user ainda não tem Klub)
 * - 1 → `/k/:slug/dashboard` (caminho direto)
 * - N → `/escolher-klub` (mostra picker)
 *
 * Versão minimalista pra Onda 1 PR4. PR5 vai adicionar persistência
 * de "último Klub visitado" via cookie e UI de loading polida.
 */
function PostLoginRouter() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMyKlubs()
      .then((klubs) => {
        if (cancelled) return;
        const only = klubs.length === 1 ? klubs[0] : null;
        if (klubs.length === 0) {
          router.replace('/criar-klub');
        } else if (only) {
          router.replace(`/k/${only.klubSlug}/dashboard`);
        } else {
          router.replace('/escolher-klub');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      {errorMessage ? (
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-bold">Erro ao carregar Klubs</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Resolvendo seu Klub…</p>
      )}
    </main>
  );
}
