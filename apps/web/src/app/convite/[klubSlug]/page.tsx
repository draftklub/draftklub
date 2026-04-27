'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Klub } from '@draftklub/shared-types';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { LoginForm } from '@/components/login/login-form';
import { useAuth } from '@/components/auth-provider';
import { ApiError } from '@/lib/api/client';
import { getKlubBySlug, joinKlubBySlug } from '@/lib/api/klubs';
import { rememberLastKlubSlug } from '@/lib/last-klub-cookie';

/**
 * Aceitar convite por link compartilhado: `/convite/:klubSlug`.
 *
 * Pública — sem AuthGuard. Fluxo:
 * 1. Carrega Klub pelo slug (404 se inválido).
 * 2. Se user não logado → mostra info do Klub + LoginForm.
 * 3. Se user logado → CTA "Entrar no Klub" → POST /klubs/slug/:slug/join.
 *    Idempotente, então re-clicks no-op.
 * 4. Sucesso → redireciona pra /k/:slug/dashboard com cookie setado.
 */
export default function ConvitePage() {
  const params = useParams<{ klubSlug: string }>();
  const slug = params.klubSlug;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [klub, setKlub] = React.useState<Klub | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getKlubBySlug(slug)
      .then((data) => {
        if (!cancelled) setKlub(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadError(`Convite inválido: nenhum Klub com slug "${slug}".`);
        } else {
          setLoadError(err instanceof Error ? err.message : 'Erro ao carregar Klub');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleJoin() {
    setJoining(true);
    setJoinError(null);
    try {
      await joinKlubBySlug(slug);
      rememberLastKlubSlug(slug);
      router.replace(`/k/${slug}/dashboard`);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Erro ao entrar no Klub');
      setJoining(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Convite inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Voltar pra tela inicial
          </Link>
        </div>
      </Shell>
    );
  }

  if (klub === null || authLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando convite…</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Você foi convidado pra
        </p>
        <h1
          className="mt-2 font-display text-[28px] font-bold md:text-[36px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          {klub.name}
        </h1>
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">/k/{klub.slug}</p>
      </div>

      {!user ? (
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-center text-[14px] text-muted-foreground">
            Entra com sua conta pra aceitar o convite. Sem conta? Crie uma com o botão Google.
          </p>
          <LoginForm formWidth={320} />
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-center text-[14px] text-muted-foreground">
            Logado como <b>{user.email ?? '—'}</b>
          </p>
          {joinError ? (
            <p className="text-[13px] text-destructive" role="alert">
              {joinError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining}
            className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {joining ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                <Check className="size-4" />
                Entrar no Klub
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
            Você vai entrar como <b>Jogador</b>. O Klub Admin pode promover depois.
          </p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLockup size="lg" />
        </div>
        {children}
      </div>
    </main>
  );
}
