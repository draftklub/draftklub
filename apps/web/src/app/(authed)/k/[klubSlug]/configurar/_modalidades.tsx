'use client';

/**
 * Sprint O batch O-7 — ModalidadesTab extraída de _components.tsx.
 */

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import type { Klub, KlubSportProfile, SportCatalog } from '@draftklub/shared-types';
import { addSportToKlub, listKlubSports, listSports } from '@/lib/api/sports';
import { Banner } from '@/components/ui/banner';
import { cn } from '@/lib/utils';
import { toErrorMessage } from './_form-helpers';

// ─── Modalidades tab ────────────────────────────────────────────────────

export function ModalidadesTab({ klub }: { klub: Klub }) {
  const queryClient = useQueryClient();
  const [enabling, setEnabling] = React.useState<string | null>(null);
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const { data, error: fetchError } = useQuery({
    queryKey: ['modalidades-tab', klub.id],
    queryFn: async () => {
      const [all, profiles] = await Promise.all([listSports(), listKlubSports(klub.id)]);
      return { sports: all, enabled: profiles };
    },
  });

  const sports = data?.sports ?? null;
  const enabled = data?.enabled ?? [];
  const fetchErrorMsg = fetchError
    ? toErrorMessage(fetchError, 'Erro ao carregar modalidades.')
    : null;
  const error = fetchErrorMsg ?? mutationError;

  async function handleEnable(code: string) {
    if (enabling) return;
    setEnabling(code);
    setMutationError(null);
    try {
      const profile = await addSportToKlub(klub.id, code);
      queryClient.setQueryData(
        ['modalidades-tab', klub.id],
        (old: { sports: SportCatalog[]; enabled: KlubSportProfile[] } | undefined) =>
          old ? { ...old, enabled: [...old.enabled, profile] } : old,
      );
      setMessage(`Modalidade ${profile.sportCode} habilitada.`);
    } catch (err: unknown) {
      setMutationError(toErrorMessage(err, 'Erro ao habilitar modalidade.'));
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
