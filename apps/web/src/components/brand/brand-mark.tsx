'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export type BrandTone = 'primary' | 'light' | 'outline';

interface BrandMarkProps {
  /** Px — tamanho do mark quadrado (default 56). */
  size?: number;
  /**
   * - `primary` (default): PNG canon do design system. Auto-swap para versão
   *   dark quando `.dark` está ativo. Use sobre fundo claro.
   * - `light`: PNG light dentro de tile branco arredondado. Use sobre fundo
   *   escuro/hero verde.
   * - `outline`: alias de `primary` (compat).
   */
  tone?: BrandTone;
  /**
   * Força a versão light mesmo com dark mode ativo. Útil em hero verde
   * próprio que não deve seguir o tema da página.
   */
  forceLight?: boolean;
  /** Border-radius em px. Default = 22% do size. */
  radius?: number;
  className?: string;
  alt?: string;
}

/**
 * DraftKlub mark (chevron aberto + gradient verde) — opção 10 canon do
 * Design System. Renderiza o PNG do `/public/icon-*.png`.
 */
export function BrandMark({
  size = 56,
  tone = 'primary',
  forceLight = false,
  radius,
  className,
  alt = 'DraftKlub',
}: BrandMarkProps) {
  const { resolvedTheme } = useTheme();
  const r = radius ?? Math.round(size * 0.22);

  // Em dark mode, tone='primary' usa o PNG dark (mark luminoso pra fundo preto).
  // tone='light' sempre usa o PNG light dentro de tile branco (hero verde escuro).
  const isDark = !forceLight && resolvedTheme === 'dark';
  const useDarkAsset = tone === 'primary' && isDark;
  const src = useDarkAsset ? '/icon-dark-512.png' : '/icon-512.png';

  if (tone === 'light') {
    return (
      <span
        className={cn('inline-flex shrink-0 overflow-hidden bg-white', className)}
        style={{ width: size, height: size, borderRadius: r }}
        aria-label={alt}
      >
        <Image
          src="/icon-512.png"
          alt=""
          width={size}
          height={size}
          priority
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: r }}
      aria-label={alt}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        priority
        style={{ width: size, height: size, borderRadius: r }}
      />
    </span>
  );
}
