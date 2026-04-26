'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRightLeft, Check, ChevronDown } from 'lucide-react';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMyKlubs } from '@/lib/api/me';
import { cn } from '@/lib/utils';

/**
 * Dropdown de troca rápida de Klub na topbar (estilo Slack workspace
 * switcher). Mostra o Klub ativo + lista compacta dos outros Klubs do
 * user. Item terminal "Mudar de Klub" leva pra `/escolher-klub`.
 *
 * Lazy-fetch: só chama `GET /me/klubs` quando o user abre o dropdown
 * pela primeira vez.
 */
export function KlubSwitcher() {
  const { klub, slug } = useActiveKlub();
  const [open, setOpen] = React.useState(false);
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open || klubs !== null) return;
    let cancelled = false;
    getMyKlubs()
      .then((data) => {
        if (cancelled) return;
        setKlubs(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Erro ao listar Klubs');
      });
    return () => {
      cancelled = true;
    };
  }, [open, klubs]);

  // Click fora fecha o dropdown.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const others = klubs?.filter((k) => k.klubSlug !== slug) ?? [];

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="-mx-2 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted"
      >
        <div className="min-w-0">
          <h1
            className="truncate font-display text-[20px] font-bold leading-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            {klub?.name ?? 'Klub'}
          </h1>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
            /{slug}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border px-3 pb-2 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Klub atual
            </p>
            <p className="mt-1 truncate text-[13.5px] font-semibold">
              {klub?.name ?? 'Klub'}
            </p>
          </div>

          <div className="px-3 pb-2 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Trocar pra
            </p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {klubs === null && !loadError ? (
                <li className="px-2 py-2 text-[12px] text-muted-foreground">
                  Carregando…
                </li>
              ) : null}
              {loadError ? (
                <li className="px-2 py-2 text-[12px] text-destructive">
                  {loadError}
                </li>
              ) : null}
              {klubs && others.length === 0 && !loadError ? (
                <li className="px-2 py-2 text-[12px] text-muted-foreground">
                  Você só tem esse Klub.
                </li>
              ) : null}
              {others.map((k) => (
                <li key={k.klubId}>
                  <Link
                    href={`/k/${k.klubSlug}/dashboard`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-muted"
                  >
                    <Check className="invisible size-3.5 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{k.klubName}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      /{k.klubSlug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border p-2">
            <Link
              href="/escolher-klub"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowRightLeft className="size-3.5 text-muted-foreground" />
              Mudar de Klub
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
