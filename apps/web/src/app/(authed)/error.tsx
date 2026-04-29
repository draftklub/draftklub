'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Sprint M batch SM-5 — error boundary do segmento (authed).
 * Captura exceptions de qualquer página/layout dentro do route group.
 * Sem isso, qualquer erro 5xx do API ou throw em componente vira tela branca.
 */
export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled error in (authed):', error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="font-display text-xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tivemos um problema ao carregar essa página. Já fomos notificados — tenta de novo em
          alguns instantes.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">id: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="size-4" />
            Tentar de novo
          </button>
          <Link
            href="/home"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Ir pra home
          </Link>
        </div>
      </div>
    </main>
  );
}
