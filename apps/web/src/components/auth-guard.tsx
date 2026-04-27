'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Redirect destination quando não autenticado. Default `/login`. */
  fallbackUrl?: string;
}

/**
 * Client guard pra rotas protegidas. Use num layout client wrapper.
 *
 * Comportamento:
 * - Enquanto `useAuth().loading` é true → renderiza placeholder neutro
 *   (evita flicker de redirect).
 * - Sem user logado → `router.replace(fallbackUrl)`.
 * - Com user → renderiza children.
 */
export function AuthGuard({ children, fallbackUrl = '/login' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(fallbackUrl);
    }
  }, [loading, user, router, fallbackUrl]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  return <>{children}</>;
}

interface RedirectIfAuthenticatedProps {
  /** Destino quando user já está logado. Default `/post-login`. */
  to?: string;
}

/**
 * Inverso do AuthGuard — redireciona pra `/post-login` (ou `to`) se o
 * user já está autenticado. Coloque dentro de páginas públicas (login,
 * signup) pra evitar mostrar o form pra quem já entrou.
 */
export function RedirectIfAuthenticated({ to = '/post-login' }: RedirectIfAuthenticatedProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace(to);
    }
  }, [loading, user, router, to]);

  return null;
}
