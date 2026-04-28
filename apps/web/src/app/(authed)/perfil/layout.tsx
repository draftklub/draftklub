'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { MeResponse } from '@draftklub/shared-types';
import { useAuth } from '@/components/auth-provider';
import { getMe } from '@/lib/api/me';
import { Banner } from '@/components/ui/banner';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { EmailVerifyBanner } from '@/components/email-verify-banner';
import { ProfileContextProvider } from './_context';

/**
 * Sprint L PR-L4 — layout shell de `/perfil`.
 *
 * Substitui o monolito de 1361 linhas. Cada sub-rota (page/pessoa-fisica/
 * endereco/preferencias/notificacoes/acesso) renderiza apenas sua
 * seção, consumindo me + user via context.
 */
export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setMe(null);
    void getMe()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const baseHref = '/perfil';
  const seg = pathname.replace(baseHref, '').replace(/^\//, '').split('/')[0] ?? '';
  const activeSeg = seg.length > 0 ? seg : 'identidade';

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="Perfil" description="Suas informações de conta e métodos de login." />

        <Tabs
          mode="link"
          tabs={[
            { id: 'identidade', label: 'Identidade', href: baseHref },
            { id: 'pessoa-fisica', label: 'CPF', href: `${baseHref}/pessoa-fisica` },
            { id: 'endereco', label: 'Endereço', href: `${baseHref}/endereco` },
            { id: 'preferencias', label: 'Preferências', href: `${baseHref}/preferencias` },
            {
              id: 'notificacoes',
              label: 'Notificações',
              href: `${baseHref}/notificacoes`,
            },
            { id: 'acesso', label: 'Acesso', href: `${baseHref}/acesso` },
          ]}
          active={activeSeg}
        />

        <EmailVerifyBanner />

        {loadError ? (
          <Banner tone="error" title="Falha ao carregar">
            <span className="block">{loadError}</span>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Loader2 className="size-3.5" />
              Tentar de novo
            </button>
          </Banner>
        ) : !me || !user ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ProfileContextProvider
            value={{
              user,
              me,
              onMeUpdated: (next) => setMe(next),
            }}
          >
            {children}
          </ProfileContextProvider>
        )}
      </div>
    </main>
  );
}
