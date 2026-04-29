'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { getFeatures } from '@/lib/api/features';
import type { FeatureItem } from '@/lib/api/features';
import { patchFeature } from '@/lib/api/features-admin';
import { invalidateFeaturesCache } from '@/hooks/use-feature';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import { cn } from '@/lib/utils';

type FeatureTier = 'free' | 'premium' | 'disabled';

const TIER_LABELS: Record<FeatureTier, string> = {
  free: 'Grátis',
  premium: 'Premium',
  disabled: 'Desativado',
};

const TIER_COLORS: Record<FeatureTier, string> = {
  free: 'bg-success/10 text-success',
  premium: 'bg-primary/10 text-primary',
  disabled: 'bg-muted text-muted-foreground',
};

interface RowState {
  saving: boolean;
  error: string | null;
  saved: boolean;
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = React.useState<FeatureItem[] | null>(null);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [rowState, setRowState] = React.useState<Record<string, RowState>>({});

  React.useEffect(() => {
    let cancelled = false;
    getFeatures()
      .then((data) => {
        if (!cancelled) setFeatures(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPageError(err instanceof ApiError ? err.message : 'Erro ao carregar features.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setRow(id: string, patch: Partial<RowState>) {
    setRowState((prev) => ({ ...prev, [id]: { saving: false, error: null, saved: false, ...prev[id], ...patch } }));
  }

  async function handlePatch(id: string, input: { tier?: FeatureTier; enabled?: boolean }) {
    setRow(id, { saving: true, error: null, saved: false });
    try {
      const updated = await patchFeature(id, input);
      invalidateFeaturesCache();
      setFeatures((prev) =>
        prev ? prev.map((f) => (f.id === id ? { ...f, ...updated } : f)) : prev,
      );
      setRow(id, { saving: false, saved: true });
      setTimeout(() => setRow(id, { saved: false }), 2500);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Falha ao salvar.';
      setRow(id, { saving: false, error: msg });
    }
  }

  if (pageError) {
    return (
      <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <PageHeader title="Feature Gates" description="Gestão de features por tier" />
          <div className="mt-6">
            <Banner tone="error">{pageError}</Banner>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Feature Gates"
          description="Controle quais features estão ativas e para qual tier. Mudanças têm efeito imediato."
        />

        <div className="mt-8 rounded-xl border border-border bg-card">
          {features === null ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : features.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma feature cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Feature
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Tier
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Ativo
                    </th>
                    <th className="w-[140px] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Rollout %
                    </th>
                    <th className="w-[80px] px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {features.map((f) => {
                    const rs = rowState[f.id];
                    return (
                      <tr key={f.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">{f.id}</div>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={f.tier}
                            disabled={rs?.saving}
                            onChange={(e) =>
                              void handlePatch(f.id, { tier: e.target.value as FeatureTier })
                            }
                            className={cn(
                              'rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50',
                              TIER_COLORS[f.tier] ?? '',
                            )}
                          >
                            {(Object.entries(TIER_LABELS) as [FeatureTier, string][]).map(
                              ([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            disabled={rs?.saving}
                            onClick={() => void handlePatch(f.id, { enabled: !f.enabled })}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                            aria-label={f.enabled ? 'Desativar feature' : 'Ativar feature'}
                          >
                            {f.enabled ? (
                              <ToggleRight className="size-5 text-success" />
                            ) : (
                              <ToggleLeft className="size-5 text-muted-foreground" />
                            )}
                            <span className={f.enabled ? 'text-success' : 'text-muted-foreground'}>
                              {f.enabled ? 'Sim' : 'Não'}
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="group relative inline-flex items-center gap-1">
                            <input
                              type="number"
                              value={f.rolloutPct}
                              min={0}
                              max={100}
                              disabled
                              className="w-16 rounded-md border border-border bg-muted px-2.5 py-1.5 text-center text-xs text-muted-foreground"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <span className="pointer-events-none absolute -top-7 left-0 hidden whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                              em breve
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex h-5 items-center justify-center">
                            {rs?.saving && (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            )}
                            {rs?.saved && <CheckCircle2 className="size-4 text-success" />}
                            {rs?.error && (
                              <span
                                title={rs.error}
                                className="cursor-help"
                              >
                                <XCircle className="size-4 text-destructive" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Mudanças são gravadas imediatamente + trilha de auditoria.
          Feature inexistente num Klub = tier <code>free</code> por padrão.
        </p>
      </div>
    </main>
  );
}
