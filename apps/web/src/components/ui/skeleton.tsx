import { cn } from '@/lib/utils';

/**
 * Sprint O batch O-1 — Skeleton consolidado.
 *
 * Substitui ~5 implementações ad-hoc de `animate-pulse rounded-X bg-muted`
 * espalhadas (dashboard, modalidades, buscar-klubs). Padroniza shape via
 * variants (line, card, circle, rect) e respeita prefers-reduced-motion
 * (a animação some via media query do Tailwind v4 default).
 *
 * Convenção: usar Skeleton só pra placeholder de conteúdo que está
 * carregando do server. Pra estado loading inline (botão submitando),
 * use Spinner.
 */
export interface SkeletonProps {
  /** Shape preset. `line` é text/value (h-4); `card` é bloco maior (h-44);
   *  `circle` é avatar/icon (size-N via `size`); `rect` é raw rectangle. */
  variant?: 'line' | 'card' | 'circle' | 'rect';
  /** Tamanho pra `circle` (Tailwind size class shorthand). */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CIRCLE_SIZE: Record<NonNullable<SkeletonProps['size']>, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

const VARIANT_CLASS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  line: 'h-4 w-full rounded',
  card: 'h-44 w-full rounded-xl border border-border',
  circle: 'rounded-full',
  rect: '',
};

export function Skeleton({ variant = 'rect', size = 'md', className }: SkeletonProps) {
  const variantClass = VARIANT_CLASS[variant];
  const sizeClass = variant === 'circle' ? CIRCLE_SIZE[size] : '';
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn('animate-pulse bg-muted', variantClass, sizeClass, className)}
    />
  );
}
