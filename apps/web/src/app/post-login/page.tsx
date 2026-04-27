'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { getMyKlubs } from '@/lib/api/me';
import { readLastKlubSlug } from '@/lib/last-klub-cookie';

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
 * - 0 → `/escolher-klub` (empty state com 3 paths: buscar, criar, intake)
 * - 1 → `/k/:slug/dashboard` direto
 * - N + cookie `dk_last_klub_slug` ainda válido → `/k/:slug/dashboard`
 * - N sem cookie ou cookie stale → `/escolher-klub`
 *
 * O 0-memberships antes ia direto pra `/criar-klub`, mas a maioria dos
 * usuários novos quer entrar num Klub existente — não criar um. O
 * `/escolher-klub` agora oferece os 3 caminhos.
 */
function PostLoginRouter() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setErrorMessage(null);

    getMyKlubs()
      .then((klubs) => {
        if (cancelled) return;
        if (klubs.length === 0) {
          router.replace('/escolher-klub');
          return;
        }

        if (klubs.length === 1) {
          const only = klubs[0];
          if (only) router.replace(`/k/${only.klubSlug}/dashboard`);
          return;
        }

        const lastSlug = readLastKlubSlug();
        const lastStillValid = lastSlug && klubs.some((k) => k.klubSlug === lastSlug);
        if (lastStillValid) {
          router.replace(`/k/${lastSlug}/dashboard`);
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
  }, [router, reloadToken]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      {errorMessage ? (
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-bold">Erro ao carregar Klubs</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Resolvendo seu Klub…</p>
        </div>
      )}
    </main>
  );
}
