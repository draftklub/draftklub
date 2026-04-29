'use client';

import * as React from 'react';
import Link from 'next/link';
import { Castle, Loader2, Plus, Search } from 'lucide-react';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { EmptyState } from '@/components/ui/empty-state';
import { getMyKlubs } from '@/lib/api/me';
import { rememberLastKlubSlug } from '@/lib/last-klub-cookie';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-H2 — landing consolidada de Klubs:
 * - Meus Klubs (cards) — atalho pro dashboard de cada um
 * - CTAs Buscar Klubs (rota existente) e Criar Klub
 *
 * Substitui a duplicação que tinha na sidebar (Criar/Buscar como
 * itens separados). Sidebar agora aponta só pra /klubs.
 */
export default function KlubsPage() {
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMyKlubs()
      .then((data) => {
        if (!cancelled) setKlubs(data);
      })
      .catch(() => {
        if (!cancelled) setKlubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-primary-600">
            Você
          </p>
          <h1
            className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            Klubs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Os Klubs em que você participa, ou descubra outros.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/buscar-klubs"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Search className="size-3.5" />
            Buscar Klubs
          </Link>
          <Link
            href="/criar-klub"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
          >
            <Plus className="size-3.5" />
            Criar Klub
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold">Meus Klubs</h2>
          {klubs === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : klubs.length === 0 ? (
            <EmptyState
              icon={Castle}
              title="Nenhum Klub ainda"
              description="Use os botões acima pra entrar num Klub existente ou criar o seu."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {klubs.map((k) => (
                <li key={k.klubId}>
                  <KlubCard klub={k} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function KlubCard({ klub }: { klub: UserKlubMembership }) {
  const label = klub.klubCommonName ?? klub.klubName;
  const initial = label.trim().charAt(0).toUpperCase() || 'K';
  const hue = Array.from(label).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const role = klub.role;
  const roleLabel =
    role === 'KLUB_ADMIN'
      ? 'Admin'
      : role === 'SPORT_STAFF'
        ? 'Staff'
        : role === 'SPORT_COMMISSION'
          ? 'Comissão'
          : role === 'PLAYER'
            ? 'Player'
            : null;

  return (
    <Link
      href={`/k/${klub.klubSlug}/dashboard`}
      onClick={() => rememberLastKlubSlug(klub.klubSlug)}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-base font-bold text-white',
        )}
        style={{ background: `hsl(${hue} 55% 42%)` }}
        aria-hidden="true"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold">{label}</p>
        {klub.klubCommonName ? (
          <p className="truncate text-xs text-muted-foreground">{klub.klubName}</p>
        ) : null}
        {roleLabel ? (
          <span className="mt-1 inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            {roleLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
