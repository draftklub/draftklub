import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type BrandTone = 'primary' | 'light' | 'outline';

interface BrandMarkProps {
  /** Px — tamanho do mark quadrado (default 56). */
  size?: number;
  /**
   * - `primary` (default): PNG canon do design system. Mesma asset em light
   *   e dark mode (alinha com a tela de login).
   * - `light`: PNG light dentro de tile branco arredondado. Use sobre fundo
   *   escuro/hero verde.
   * - `outline`: alias de `primary` (compat).
   */
  tone?: BrandTone;
  /**
   * Compat — antes forçava versão light em dark mode (que tinha asset
   * dedicado). Hoje sem efeito porque sempre usamos a mesma asset
   * em ambos os temas.
   */
  forceLight?: boolean;
  /** Border-radius em px. Default = 22% do size. */
  radius?: number;
  className?: string;
  alt?: string;
}

/**
 * DraftKlub mark (chevron aberto + gradient verde) — opção 10 canon do
 * Design System. Renderiza o PNG do `/public/icon-512.png` em ambos os
 * temas (light/dark) — alinha com a tela de login que sempre mostra a
 * versão clara.
 */
export function BrandMark({
  size = 56,
  tone = 'primary',
  forceLight: _forceLight = false,
  radius,
  className,
  alt = 'DraftKlub',
}: BrandMarkProps) {
  const r = radius ?? Math.round(size * 0.22);
  const src = '/icon-512.png';

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
