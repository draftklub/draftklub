'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ListOrdered, Sparkles, Trophy } from 'lucide-react';
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
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {klubLabel}
        </Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            {klubLabel} · Modalidade
          </p>
          <h1
            className="mt-1 font-display text-[26px] font-bold leading-tight md:text-[32px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {sportLabel}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Drill-down do que está acontecendo nessa modalidade no {klubLabel}.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/k/${klub.slug}/sports/${sportCode}/torneios`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[hsl(var(--brand-primary-600))]">
              <Trophy className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-bold">Torneios</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Em andamento, próximos e finalizados
              </p>
            </div>
          </Link>
          <Link
            href={`/k/${klub.slug}/sports/${sportCode}/rankings`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[hsl(var(--brand-primary-600))]">
              <ListOrdered className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] font-bold">Ranking</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Lista de jogadores, posições e ratings
              </p>
            </div>
          </Link>
          <PlaceholderCard
            icon={Sparkles}
            title="Comissão"
            hint="Quem aprova enrollments e organiza torneios"
          />
        </section>

        <div className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
          Em breve! Comissão. Torneios e Ranking já estão funcionando — clique nos cards acima.
        </div>
      </div>
    </main>
  );
}

function PlaceholderCard({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Trophy;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-5 text-muted-foreground" />
      <p className="mt-2 font-display text-[14px] font-bold">{title}</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">{hint}</p>
      <span className="mt-3 inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        em breve
      </span>
    </div>
  );
}
