'use client';

import * as React from 'react';
import { ChevronUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Personas suportadas pra preview em dev. Em produção, a persona real
 * é determinada pelos `roleAssignments` do user — esse componente é
 * dev-only.
 */
export type Persona = 'real' | 'player_free' | 'player_premium' | 'klub_admin';

const STORAGE_KEY = 'dk_dev_persona';
const PERSONA_LABELS: Record<Persona, string> = {
  real: 'Real (roleAssignments)',
  player_free: 'Player · Free',
  player_premium: 'Player · Premium',
  klub_admin: 'Klub Admin',
};

/**
 * Hook que retorna a persona atual. Em produção sempre `'real'`. Em
 * dev lê do localStorage (default `'real'`).
 */
export function usePersona(): Persona {
  const [persona, setPersona] = React.useState<Persona>('real');

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isPersona(stored)) setPersona(stored);

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue && isPersona(e.newValue)) setPersona(e.newValue);
      if (e.newValue === null) setPersona('real');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return persona;
}

function isPersona(v: string): v is Persona {
  return v === 'real' || v === 'player_free' || v === 'player_premium' || v === 'klub_admin';
}

/**
 * Botão flutuante (dev-only) pra alternar persona. Renderiza null em
 * produção. Salva no localStorage e força reload pra propagar pelo
 * resto da árvore (suficiente pra Onda 1; Onda 2 vai pra Context).
 */
export function PersonaSwitcher() {
  const [open, setOpen] = React.useState(false);
  const [persona, setPersonaState] = React.useState<Persona>('real');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isPersona(stored)) setPersonaState(stored);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (process.env.NODE_ENV !== 'development') return null;

  function pickPersona(next: Persona) {
    if (typeof window === 'undefined') return;
    if (next === 'real') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    setPersonaState(next);
    setOpen(false);
    // Reload pra propagar pelo resto da arvore (ate Onda 2 fazer Context).
    window.location.reload();
  }

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="mb-2 w-55 rounded-xl border border-border bg-card p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Dev · ver como
          </p>
          <ul className="flex flex-col gap-0.5">
            {(Object.keys(PERSONA_LABELS) as Persona[]).map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => pickPersona(p)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-muted',
                    persona === p && 'font-semibold text-[hsl(var(--brand-primary-600))]',
                  )}
                >
                  <span>{PERSONA_LABELS[p]}</span>
                  {persona === p ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12px] font-medium shadow-md transition-colors hover:bg-muted"
      >
        <Eye className="size-3.5 text-muted-foreground" />
        {PERSONA_LABELS[persona]}
        <ChevronUp
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
    </div>
  );
}
