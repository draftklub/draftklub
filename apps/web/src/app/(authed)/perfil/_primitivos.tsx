'use client';

/**
 * Sprint O batch O-8 — primitivos de formulário do /perfil extraídos de
 * _components.tsx (megafile 1319 linhas).
 *
 * Exports: Section, Field, FormFooter, ProviderCard, inputCls,
 * primaryBtnCls, secondaryBtnCls, ghostBtnCls, validateCpfChecksum.
 */

import * as React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Primitives ─────────────────────────────────────────────────────────

export function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={cn(
          'mb-2 font-display text-xs font-bold uppercase tracking-[0.06em]',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormFooter({
  children,
  error,
  success,
}: {
  children: React.ReactNode;
  error?: string | null;
  success?: string | null;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <div className="flex-1">
        {error ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="flex items-start gap-1.5 text-xs text-success" role="status">
            <Check className="mt-px size-3.5 shrink-0" />
            {success}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function ProviderCard({
  label,
  email,
  badge,
  badgeTone,
  children,
}: {
  label: string;
  email?: string;
  badge: string;
  badgeTone: 'success' | 'neutral';
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          {email ? (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
            badgeTone === 'success'
              ? 'bg-primary/10 text-brand-primary-600'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

export const inputCls = (hasError: boolean) =>
  cn(
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors',
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError && 'border-destructive ring-[3px] ring-destructive/20',
  );

export const primaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';

export const ghostBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';

export function validateCpfChecksum(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === Number(cpf[10]);
}
