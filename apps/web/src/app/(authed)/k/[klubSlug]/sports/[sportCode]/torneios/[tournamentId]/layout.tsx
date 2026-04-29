'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { TournamentDetail, TournamentStatus } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { getTournament } from '@/lib/api/tournaments';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
import { Banner } from '@/components/ui/banner';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { TournamentContextProvider } from './_context';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Rascunho',
  prequalifying: 'Pré-qualificatória',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const STATUS_TONE: Record<TournamentStatus, 'primary' | 'muted' | 'destructive' | 'warning'> = {
  draft: 'warning',
  prequalifying: 'primary',
  in_progress: 'primary',
  finished: 'muted',
  cancelled: 'destructive',
};

const FORMAT_LABELS: Record<string, string> = {
  knockout: 'Eliminatória',
  round_robin: 'Todos contra todos',
  double_elimination: 'Eliminação dupla',
  groups_knockout: 'Grupos + eliminatória',
};

/**
 * Sprint L PR-L2 — layout shell do tournament detail.
 *
 * Substitui as primeiras ~200 linhas de page.tsx que faziam
 * fetch + tabs + header. Cada sub-rota (page/chave/inscritos/
 * operacoes) consome o context provido aqui.
 */
export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ klubSlug: string; sportCode: string; tournamentId: string }>();
  const pathname = usePathname();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const tournamentId = params.tournamentId;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [tournament, setTournament] = React.useState<TournamentDetail | null>(null);
  const [meId, setMeId] = React.useState<string | null>(null);
  const [canManage, setCanManage] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void getMe()
      .then((me) => {
        if (cancelled) return;
        setMeId(me.id);
        const platform = me.roleAssignments.some((r) => isPlatformLevel(r.role));
        const local = me.roleAssignments.some(
          (r) =>
            (r.role === 'KLUB_ADMIN' ||
              r.role === 'KLUB_ASSISTANT' ||
              r.role === 'SPORT_COMMISSION') &&
            r.scopeKlubId === klub.id,
        );
        setCanManage(platform || local);
      })
      .catch(() => null);
    void getTournament(klub.id, sportCode, tournamentId)
      .then((t) => {
        if (!cancelled) setTournament(t);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar torneio.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode, tournamentId, reload]);

  if (!klub) return null;

  const baseHref = `/k/${klub.slug}/sports/${sportCode}/torneios/${tournamentId}`;
  const activeTab = pathname.endsWith('/chave')
    ? 'chave'
    : pathname.endsWith('/inscritos')
      ? 'inscritos'
      : pathname.endsWith('/operacoes')
        ? 'operacoes'
        : 'overview';

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

  if (!tournament) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          back={{
            href: `/k/${klub.slug}/sports/${sportCode}/torneios`,
            label: `Torneios · ${sportLabel}`,
          }}
          eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
          title={
            <span className="flex flex-wrap items-center gap-3">
              {tournament.name}
              <StatusBadge status={tournament.status} />
            </span>
          }
          description={
            <>
              {FORMAT_LABELS[tournament.format] ?? tournament.format}
              {tournament.hasPrequalifiers ? ' · com pré-qualificatória' : ''}
              {' · '}
              {tournament.categories.length}{' '}
              {tournament.categories.length === 1 ? 'categoria' : 'categorias'} ·{' '}
              {tournament.entryCount} inscritos
            </>
          }
        />

        <Tabs
          mode="link"
          tabs={[
            { id: 'overview', label: 'Visão geral', href: baseHref },
            { id: 'chave', label: 'Chave', href: `${baseHref}/chave` },
            { id: 'inscritos', label: 'Inscritos', href: `${baseHref}/inscritos` },
            ...(canManage
              ? [{ id: 'operacoes', label: 'Operações', href: `${baseHref}/operacoes` }]
              : []),
          ]}
          active={activeTab}
        />

        <TournamentContextProvider
          value={{
            klub,
            tournament,
            reload: () => setReload((n) => n + 1),
            meId,
            canManage,
          }}
        >
          {children}
        </TournamentContextProvider>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: TournamentStatus }) {
  const tone = STATUS_TONE[status];
  const toneClass: Record<typeof tone, string> = {
    primary: 'bg-primary/15 text-brand-primary-600',
    muted: 'bg-muted text-muted-foreground',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/15 text-warning dark:text-warning',
  };
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-wider ${toneClass[tone]}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
