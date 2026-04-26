'use client';

import * as React from 'react';
import { BrandMark, type BrandTone } from './brand-mark';
import { cn } from '@/lib/utils';

type LockupSize = 'sm' | 'lg' | 'xl';
type LockupTone = 'dark' | 'light';

interface BrandLockupProps {
  /**
   * - `sm` 32px mark + wordmark 14px
   * - `lg` 56px mark + wordmark 22px (default)
   * - `xl` 72px mark + wordmark 28px
   */
  size?: LockupSize;
  /**
   * - `dark` (default) — wordmark em foreground, "Klub" em primary. Use sobre
   *   fundo claro.
   * - `light` — wordmark branco, "Klub" em brand-primary-300. Use sobre fundo
   *   escuro/hero verde. Força BrandMark `light` (tile branco).
   */
  tone?: LockupTone;
  className?: string;
}

const SIZES: Record<LockupSize, { mark: number; word: number; gap: number }> = {
  sm: { mark: 32, word: 14, gap: 10 },
  lg: { mark: 56, word: 22, gap: 14 },
  xl: { mark: 72, word: 28, gap: 18 },
};

/**
 * Lock-up "DraftKlub" — mark canon + wordmark "Draft**Klub**" (Klub em primary).
 *
 * Tons:
 *   - `dark` (default): mark + wordmark foreground, "Klub" primary verde.
 *   - `light`: mark light (tile branco), wordmark branco, "Klub" primary-300.
 */
export function BrandLockup({ size = 'lg', tone = 'dark', className }: BrandLockupProps) {
  const dims = SIZES[size];
  const markTone: BrandTone = tone === 'light' ? 'light' : 'primary';
  const wordColor =
    tone === 'light' ? 'rgb(255 255 255)' : 'hsl(var(--foreground))';
  const klubColor =
    tone === 'light' ? 'hsl(var(--brand-primary-300))' : 'hsl(var(--primary))';

  return (
    <span
      className={cn('inline-flex items-center leading-none', className)}
      style={{ gap: dims.gap }}
      aria-label="DraftKlub"
    >
      <BrandMark size={dims.mark} tone={markTone} forceLight={tone === 'light'} />
      <span
        className="font-display"
        style={{
          fontSize: `${dims.word}px`,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: wordColor,
        }}
      >
        Draft<span style={{ color: klubColor }}>Klub</span>
      </span>
    </span>
  );
}
