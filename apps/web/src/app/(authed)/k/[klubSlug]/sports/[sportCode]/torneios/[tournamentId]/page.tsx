'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import { formatDateInTz, isBrowserInKlubTz, klubTzLabel } from '@/lib/format-datetime';
import { useTournamentContext } from './_context';

/**
 * Sprint L PR-L2 — Overview do torneio (default da rota detail).
 *
 * Substitui o componente Overview que ficava inline no antigo
 * page.tsx de 3243 linhas. Agora usa context (tournament + klub vêm
 * do layout) e Banner pro warning de timezone.
 */
export default function TournamentOverviewPage() {
  const { tournament, klub } = useTournamentContext();
  const timezone = klub.timezone ?? undefined;
  const tzMismatch = !isBrowserInKlubTz(timezone);

  return (
    <div className="space-y-4">
      {tzMismatch ? (
        <Banner tone="warning">
          Datas exibidas no fuso do Klub: <strong>{klubTzLabel(timezone)}</strong>. Seu navegador
          está em outro fuso.
        </Banner>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateCard
          label="Inscrições"
          start={tournament.registrationOpensAt}
          end={tournament.registrationClosesAt}
          timezone={timezone}
        />
        <DateCard label="Sorteio" start={tournament.drawDate} timezone={timezone} />
        {tournament.hasPrequalifiers ? (
          <DateCard
            label="Pré-qualificatória"
            start={tournament.prequalifierStartDate}
            end={tournament.prequalifierEndDate}
            timezone={timezone}
          />
        ) : null}
        <DateCard
          label="Fase principal"
          start={tournament.mainStartDate}
          end={tournament.mainEndDate}
          timezone={timezone}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Categorias
        </h3>
        {tournament.categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Sem categorias configuradas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tournament.categories
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <p className="font-display text-sm font-bold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.maxPlayers ? `Até ${c.maxPlayers} players · ` : ''}
                    {c.minRatingExpected || c.maxRatingExpected
                      ? `rating ${c.minRatingExpected ?? '–'} a ${c.maxRatingExpected ?? '∞'}`
                      : 'sem restrição de rating'}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>

      {tournament.cancelledAt ? (
        <Banner tone="error" title="Torneio cancelado">
          Em {formatDateInTz(tournament.cancelledAt, timezone)}
          {tournament.cancellationReason ? ` — ${tournament.cancellationReason}` : ''}.
        </Banner>
      ) : null}
    </div>
  );
}

function DateCard({
  label,
  start,
  end,
  timezone,
}: {
  label: string;
  start: string | null;
  end?: string | null;
  timezone?: string;
}) {
  if (!start) return null;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const sameDay = endDate?.toDateString() === startDate.toDateString();
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 font-display text-sm font-bold">
        <Calendar className="size-3.5 text-muted-foreground" />
        {formatDateInTz(start, timezone)}
      </p>
      {endDate && !sameDay ? (
        <p className="mt-0.5 text-xs text-muted-foreground">até {formatDateInTz(end, timezone)}</p>
      ) : null}
    </div>
  );
}
