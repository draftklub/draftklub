'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Sparkles, UserCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import type { RoleAssignmentListItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubRoleAssignments } from '@/lib/api/role-assignments';
import { listKlubSports } from '@/lib/api/sports';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

/**
 * Sprint K PR-K5c — view de comissão+staff do sport. Substitui placeholder
 * "em breve" no sport drill-down. Lista 3 grupos:
 * - Klub admin/assistant (cobre tudo) — sempre relevante
 * - Sport commission (organização do sport) — filtrado por sportId quando
 *   a role é scoped por sport
 * - Sport staff (operação) — mesmo filtro
 *
 * Visível pra qualquer membro do Klub. PLAYER pode descobrir quem
 * organiza/opera a modalidade (saber quem reclamar/perguntar).
 */
export default function SportCommitteePage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [items, setItems] = React.useState<RoleAssignmentListItem[] | null>(null);
  const [sportId, setSportId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void Promise.all([listKlubRoleAssignments(klub.id), listKlubSports(klub.id)])
      .then(([rows, sports]) => {
        if (cancelled) return;
        setItems(rows);
        const profile = sports.find((s) => s.sportCode === sportCode);
        setSportId(profile?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode]);

  if (!klub) return null;

  // Filtro: SPORT_* só conta se scopeSportId === sportId atual OU é null
  // (klub-wide). KLUB_* sempre cobrem o sport.
  const filtered = (items ?? []).filter((r) => {
    if (r.role === 'KLUB_ADMIN' || r.role === 'KLUB_ASSISTANT') return true;
    if (r.role === 'SPORT_COMMISSION' || r.role === 'SPORT_STAFF') {
      return r.scopeSportId == null || r.scopeSportId === sportId;
    }
    return false;
  });

  const klubLeaders = filtered.filter(
    (r) => r.role === 'KLUB_ADMIN' || r.role === 'KLUB_ASSISTANT',
  );
  const commission = filtered.filter((r) => r.role === 'SPORT_COMMISSION');
  const staff = filtered.filter((r) => r.role === 'SPORT_STAFF');

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          back={{ href: `/k/${klub.slug}/sports/${sportCode}/dashboard`, label: sportLabel }}
          eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
          title="Comissão e operação"
          description="Quem organiza e opera essa modalidade no Klub."
        />

        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sem comissão designada"
            description="KLUB_ADMIN pode promover via Configurar Klub → tab Equipe."
          />
        ) : (
          <>
            <Group
              title="Klub Admin / Assistant"
              hint="Cobrem todas as modalidades"
              items={klubLeaders}
              icon={UserCheck}
            />
            <Group
              title="Sport Commission"
              hint="Organiza torneios, ranking e regras"
              items={commission}
              icon={Sparkles}
            />
            <Group
              title="Sport Staff"
              hint="Operação do dia-a-dia: bookings e atendimento"
              items={staff}
              icon={Users}
            />
          </>
        )}
      </div>
    </main>
  );
}

function Group({
  title,
  hint,
  items,
  icon: Icon,
}: {
  title: string;
  hint: string;
  items: RoleAssignmentListItem[];
  icon: typeof UserCheck;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="font-display text-sm font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground">· {hint}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-2.5',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.userFullName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.userEmail}</p>
            </div>
            {item.scopeSportId ? (
              <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-xs font-semibold uppercase tracking-[0.04em] text-[hsl(var(--brand-primary-600))]">
                escopo: este sport
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
