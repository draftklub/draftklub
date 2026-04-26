'use client';

import * as React from 'react';
import Link from 'next/link';
import { useActiveKlub } from '@/components/active-klub-provider';

/**
 * Gate que só renderiza children quando o ActiveKlub está resolvido.
 * Mostra estado de loading neutro ou UI de erro contextual (Klub não
 * existe / sem acesso / erro de rede). Use dentro do
 * `ActiveKlubProvider`, depois do `AuthGuard`.
 */
export function ActiveKlubGate({ children }: { children: React.ReactNode }) {
  const { klub, isLoading, error, refetch, slug } = useActiveKlub();

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando Klub…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md text-center">
          {error.type === 'not_found' ? (
            <ErrorBlock
              title="Klub não encontrado"
              body={
                <>
                  Não existe nenhum Klub com o slug{' '}
                  <code className="font-mono text-xs">{slug}</code>.
                </>
              }
            />
          ) : null}
          {error.type === 'forbidden' ? (
            <ErrorBlock
              title="Sem acesso a esse Klub"
              body="Você não é membro desse Klub. Peça pra alguém da administração te adicionar."
            />
          ) : null}
          {error.type === 'network' ? (
            <ErrorBlock
              title="Erro ao carregar Klub"
              body={error.message}
              action={
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Tentar de novo
                </button>
              }
            />
          ) : null}
          <Link
            href="/post-login"
            className="mt-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  if (!klub) return null;

  return <>{children}</>;
}

function ErrorBlock({
  title,
  body,
  action,
}: {
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
