'use client';

/**
 * Sprint O batch O-7 — ModalidadesTab extraída de _components.tsx.
 */

import * as React from 'react';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import type { Klub, KlubSportProfile, SportCatalog } from '@draftklub/shared-types';
import { addSportToKlub, listKlubSports, listSports } from '@/lib/api/sports';
import { Banner } from '@/components/ui/banner';
import { cn } from '@/lib/utils';
import { toErrorMessage } from './_form-helpers';

// ─── Modalidades tab ────────────────────────────────────────────────────

export function ModalidadesTab({ klub }: { klub: Klub }) {
  const [sports, setSports] = React.useState<SportCatalog[] | null>(null);
  const [enabled, setEnabled] = React.useState<KlubSportProfile[]>([]);
  const [enabling, setEnabling] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([listSports(), listKlubSports(klub.id)])
      .then(([all, profiles]) => {
        if (cancelled) return;
        setSports(all);
        setEnabled(profiles);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toErrorMessage(err, 'Erro ao carregar modalidades.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klub.id]);

  async function handleEnable(code: string) {
    if (enabling) return;
    setEnabling(code);
    setError(null);
    try {
      const profile = await addSportToKlub(klub.id, code);
      setEnabled((prev) => [...prev, profile]);
      setMessage(`Modalidade ${profile.sportCode} habilitada.`);
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao habilitar modalidade.'));
    } finally {
      setEnabling(null);
    }
  }

  const enabledCodes = new Set(enabled.map((p) => p.sportCode));

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      <div>
        <h2 className="font-display text-sm font-bold">Modalidades</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cada modalidade habilita catálogo próprio (ranking, torneios, regras de partida). Habilita
          só o que tu realmente atende.
        </p>
      </div>

      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      {sports === null ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sports.map((s) => {
            const isEnabled = enabledCodes.has(s.code);
            const loading = enabling === s.code;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => (isEnabled ? null : void handleEnable(s.code))}
                disabled={isEnabled || loading}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors',
                  isEnabled
                    ? 'border-success/30 bg-success/5'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.code}</p>
                </div>
                {loading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : isEnabled ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <Plus className="size-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
