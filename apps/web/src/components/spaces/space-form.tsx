'use client';

import * as React from 'react';
import type { CreateSpaceInput, UpdateSpaceInput } from '@/lib/api/spaces';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-D — form simples de Space pra create/edit em
 * `/k/:slug/quadras`. Cobre os campos básicos; hourBands ricos ficam
 * pro onboarding (Sprint Onboarding PR1) ou edição avançada futura.
 */

export interface SpaceFormValues {
  name: string;
  type: 'court' | 'room' | 'pool' | 'field' | 'other';
  sportCode?: 'tennis' | 'padel' | 'squash' | 'beach_tennis';
  surface?: 'clay' | 'hard' | 'grass' | 'synthetic' | 'carpet';
  indoor: boolean;
  hasLighting: boolean;
  maxPlayers: number;
  description?: string;
  allowedMatchTypes: ('singles' | 'doubles')[];
}

export const DEFAULT_VALUES: SpaceFormValues = {
  name: '',
  type: 'court',
  sportCode: undefined,
  surface: undefined,
  indoor: false,
  hasLighting: false,
  maxPlayers: 4,
  description: '',
  allowedMatchTypes: ['singles', 'doubles'],
};

interface SpaceFormProps {
  initial?: Partial<SpaceFormValues>;
  onSubmit: (values: CreateSpaceInput | UpdateSpaceInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
}

export function SpaceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  submitting = false,
  error,
}: SpaceFormProps) {
  const [v, setV] = React.useState<SpaceFormValues>({
    ...DEFAULT_VALUES,
    ...initial,
  });

  function set<K extends keyof SpaceFormValues>(key: K, value: SpaceFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMatch(m: 'singles' | 'doubles') {
    setV((prev) => {
      const has = prev.allowedMatchTypes.includes(m);
      const next = has
        ? prev.allowedMatchTypes.filter((x) => x !== m)
        : [...prev.allowedMatchTypes, m];
      return { ...prev, allowedMatchTypes: next.length === 0 ? prev.allowedMatchTypes : next };
    });
  }

  const valid = v.name.trim().length > 0 && v.allowedMatchTypes.length > 0;

  async function handleSubmit() {
    if (!valid || submitting) return;
    await onSubmit({
      name: v.name.trim(),
      type: v.type,
      sportCode: v.sportCode,
      surface: v.surface,
      indoor: v.indoor,
      hasLighting: v.hasLighting,
      maxPlayers: v.maxPlayers,
      description: v.description?.trim() ? v.description.trim() : undefined,
      allowedMatchTypes: v.allowedMatchTypes,
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Nome">
        <input
          value={v.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={100}
          placeholder="Ex: Quadra 1"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            value={v.type}
            onChange={(e) => set('type', e.target.value as SpaceFormValues['type'])}
            className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="court">Quadra</option>
            <option value="field">Campo</option>
            <option value="pool">Piscina</option>
            <option value="room">Sala</option>
            <option value="other">Outro</option>
          </select>
        </Field>
        <Field label="Modalidade">
          <select
            value={v.sportCode ?? ''}
            onChange={(e) =>
              set(
                'sportCode',
                e.target.value === ''
                  ? undefined
                  : (e.target.value as SpaceFormValues['sportCode']),
              )
            }
            className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="">—</option>
            <option value="tennis">Tênis</option>
            <option value="padel">Padel</option>
            <option value="squash">Squash</option>
            <option value="beach_tennis">Beach tennis</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Piso">
          <select
            value={v.surface ?? ''}
            onChange={(e) =>
              set(
                'surface',
                e.target.value === '' ? undefined : (e.target.value as SpaceFormValues['surface']),
              )
            }
            className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="">—</option>
            <option value="clay">Saibro</option>
            <option value="hard">Hard</option>
            <option value="grass">Grama</option>
            <option value="synthetic">Sintético</option>
            <option value="carpet">Carpete</option>
          </select>
        </Field>
        <Field label="Capacidade">
          <input
            type="number"
            min={1}
            max={50}
            value={v.maxPlayers}
            onChange={(e) => set('maxPlayers', parseInt(e.target.value, 10) || 1)}
            className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Toggle
          label="Coberta (indoor)"
          value={v.indoor}
          onChange={(checked) => set('indoor', checked)}
        />
        <Toggle
          label="Iluminação"
          value={v.hasLighting}
          onChange={(checked) => set('hasLighting', checked)}
        />
      </div>

      <Field label="Tipos permitidos">
        <div className="flex gap-2">
          {(['singles', 'doubles'] as const).map((m) => {
            const active = v.allowedMatchTypes.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMatch(m)}
                className={cn(
                  'flex-1 rounded-md border p-3 text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-brand-primary-600'
                    : 'border-input bg-background hover:bg-muted',
                )}
              >
                {m === 'singles' ? 'Singles' : 'Doubles'}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Descrição (opcional)">
        <textarea
          value={v.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Detalhes que ajudam o jogador (ex: tipo de bola usada, dimensões…)"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
      </Field>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!valid || submitting}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center justify-between rounded-md border p-3 text-sm font-medium transition-colors',
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
  );
}
