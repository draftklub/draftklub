'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Klub } from '@draftklub/shared-types';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { getKlubById } from '@/lib/api/klubs';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
import { Banner } from '@/components/ui/banner';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, type Tab } from '@/components/ui/tabs';
import { ConfigurarContextProvider } from './_context';

/**
 * Sprint L PR-L3 — layout shell de `/configurar`.
 *
 * Substitui as primeiras ~230 linhas de page.tsx que faziam fetch +
 * tabs + state. Cada sub-rota (page/localizacao/contato/...) consome
 * o context provido aqui.
 */
export default function ConfigurarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { klub: ctxKlub } = useActiveKlub();

  const [klub, setKlub] = React.useState<Klub | null>(null);
  const [isPlatform, setIsPlatform] = React.useState(false);
  const [isKlubAdmin, setIsKlubAdmin] = React.useState(false);
  const [canTransferAdmin, setCanTransferAdmin] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ctxKlub) return;
    let cancelled = false;
    void Promise.all([getKlubById(ctxKlub.id), getMe()])
      .then(([k, me]) => {
        if (cancelled) return;
        setKlub(k);
        const platform = me.roleAssignments.some((r) => isPlatformLevel(r.role));
        setIsPlatform(platform);
        const klubAdminOrAssistant = me.roleAssignments.some(
          (r) => (r.role === 'KLUB_ADMIN' || r.role === 'KLUB_ASSISTANT') && r.scopeKlubId === k.id,
        );
        const klubAdminOnly = me.roleAssignments.some(
          (r) => r.role === 'KLUB_ADMIN' && r.scopeKlubId === k.id,
        );
        setIsKlubAdmin(platform || klubAdminOrAssistant);
        setCanTransferAdmin(platform || klubAdminOnly);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar Klub.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ctxKlub]);

  if (!ctxKlub) return null;

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-3xl">
          <Banner tone="error" title="Erro">
            {error}
          </Banner>
        </div>
      </main>
    );
  }

  if (!klub) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const baseHref = `/k/${klub.slug}/configurar`;
  const seg =
    pathname.replace(baseHref, '').replace(/^\//, '').split('/')[0] ?? 'identidade';
  const activeSeg = seg.length > 0 ? seg : 'identidade';

  const tabs: Tab[] = [
    { id: 'identidade', label: 'Identidade', href: baseHref },
    { id: 'localizacao', label: 'Localização', href: `${baseHref}/localizacao` },
    { id: 'contato', label: 'Contato', href: `${baseHref}/contato` },
    { id: 'visibilidade', label: 'Visibilidade', href: `${baseHref}/visibilidade` },
    { id: 'modalidades', label: 'Modalidades', href: `${baseHref}/modalidades` },
    { id: 'quadras', label: 'Quadras', href: `${baseHref}/quadras` },
    {
      id: 'equipe',
      label: 'Equipe',
      href: `${baseHref}/equipe`,
      hidden: !isKlubAdmin,
    },
    {
      id: 'legal',
      label: 'Legal',
      href: `${baseHref}/legal`,
      hidden: !isPlatform,
    },
    {
      id: 'perigosa',
      label: 'Zona perigosa',
      href: `${baseHref}/perigosa`,
      hidden: !isPlatform,
    },
  ];

  function handleKlubUpdated(updated: Klub) {
    if (updated.slug !== klub?.slug) {
      window.location.href = `/k/${updated.slug}/configurar/${activeSeg}`;
      return;
    }
    setKlub(updated);
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          back={{
            href: `/k/${klub.slug}/dashboard`,
            label: 'Voltar pro Klub',
          }}
          eyebrow={`Admin · ${klub.name}`}
          title="Configurar Klub"
        />

        <Tabs mode="link" tabs={tabs} active={activeSeg} />

        <div className="pt-2">
          <ConfigurarContextProvider
            value={{
              klub,
              onKlubUpdated: handleKlubUpdated,
              isPlatform,
              isKlubAdmin,
              canTransferAdmin,
              onDeactivated: () => router.replace('/home'),
            }}
          >
            {children}
          </ConfigurarContextProvider>
        </div>
      </div>
    </main>
  );
}
