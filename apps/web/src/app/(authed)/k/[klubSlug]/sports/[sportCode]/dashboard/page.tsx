'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ListOrdered, Sparkles, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveKlub } from '@/components/active-klub-provider';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

/**
 * Sprint Polish PR-H3 — placeholder do drill-down por modalidade.
 * Dashboard real (estatísticas, torneios, ranking, agenda da modalidade
 * naquele Klub) fica pra sprints futuras. Aqui o objetivo é só validar
 * a navegação Klub → Sport e dar um CTA pro player se localizar.
 */
export default function SportDashboardPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  if (!klub) return null;

  const klubLabel = klub.commonName ?? klub.name;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          back={{ href: `/k/${klub.slug}/dashboard`, label: klubLabel }}
          eyebrow={`${klubLabel} · Modalidade`}
          title={sportLabel}
          description={`Drill-down do que está acontecendo nessa modalidade no ${klubLabel}.`}
        />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/k/${klub.slug}/sports/${sportCode}/torneios`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-primary-600">
              <Trophy className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">Torneios</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Em andamento, próximos e finalizados
              </p>
            </div>
          </Link>
          <Link
            href={`/k/${klub.slug}/sports/${sportCode}/rankings`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-primary-600">
              <ListOrdered className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">Ranking</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lista de jogadores, posições e ratings
              </p>
            </div>
          </Link>
          <Link
            href={`/k/${klub.slug}/sports/${sportCode}/comissao`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-primary-600">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold">Comissão</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Quem organiza e opera essa modalidade
              </p>
            </div>
          </Link>
        </section>

        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Torneios, Ranking e Comissão funcionando — clique nos cards acima.
        </div>
      </div>
    </main>
  );
}
