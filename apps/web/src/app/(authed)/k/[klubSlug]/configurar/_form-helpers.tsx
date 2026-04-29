'use client';

/**
 * Sprint O batch O-7 — helpers de formulário compartilhados pelas tabs de
 * /configurar. Extraído de _components.tsx (megafile 1449 linhas).
 *
 * Exports: FormTabProps, SaveStatusValue, useTabSave, Section, SaveStatus,
 * SaveButton, inputCls, Field, Toggle, toErrorMessage.
 */

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import type { Klub } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { updateKlub, type UpdateKlubInput } from '@/lib/api/klubs';
import { Banner } from '@/components/ui/banner';
import { cn } from '@/lib/utils';

export interface FormTabProps {
  klub: Klub;
  onUpdated: (updated: Klub) => void;
}

// ─── Form helpers ───────────────────────────────────────────────────────

export type SaveStatusValue =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

export function useTabSave(klubId: string, buildPayload: () => UpdateKlubInput) {
  const [status, setStatus] = React.useState<SaveStatusValue>({ kind: 'idle' });

  async function run(onUpdated: (k: Klub) => void) {
    if (status.kind === 'saving') return;
    setStatus({ kind: 'saving' });
    try {
      const payload = buildPayload();
      const updated = await updateKlub(klubId, payload);
      setStatus({ kind: 'ok', message: 'Salvo.' });
      onUpdated(updated);
    } catch (err: unknown) {
      setStatus({ kind: 'error', message: toErrorMessage(err, 'Erro ao salvar.') });
    }
  }

  return { status, run };
}

export function Section({
  title,
  status,
  onSave,
  children,
}: {
  title: string;
  status: SaveStatusValue;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-card p-3.5">
      <h2 className="font-display text-sm font-bold">{title}</h2>
      {children}
      <SaveStatus status={status} />
      <div className="flex justify-end">
        <SaveButton submitting={status.kind === 'saving'} onClick={onSave} />
      </div>
    </section>
  );
}

export function SaveStatus({ status }: { status: SaveStatusValue }) {
  if (status.kind === 'idle' || status.kind === 'saving') return null;
  if (status.kind === 'ok') {
    return <Banner tone="success">{status.message}</Banner>;
  }
  return <Banner tone="error">{status.message}</Banner>;
}

export function SaveButton({ submitting, onClick }: { submitting: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    >
      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
      Salvar
    </button>
  );
}

export const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </label>
      {children}
      {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'flex w-full items-center justify-between rounded-md border p-3 text-sm font-medium transition-colors',
          value
            ? 'border-primary bg-primary/10 text-brand-primary-600'
            : 'border-input bg-background hover:bg-muted',
        )}
      >
        <span>{label}</span>
        <span
          className={cn(
            'inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
            value ? 'border-primary bg-primary' : 'border-input bg-muted',
          )}
        >
          <span
            className={cn(
              'size-4 rounded-full bg-background transition-transform',
              value ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
      {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
