import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sprint M batch SM-4 — Spinner consolidado.
 *
 * Substitui ~90 ocorrências de `<Loader2 className="size-N animate-spin" />`
 * espalhadas pelo app. Padroniza tamanhos via prop `size` em escala
 * Tailwind (3.5 default), com aria-label opcional pra screen readers.
 */
export interface SpinnerProps {
  /** Tailwind size classes shorthand: xs=size-3, sm=size-3.5, md=size-4, lg=size-5, xl=size-6. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Texto pra screen reader. Default: "Carregando". */
  label?: string;
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
};

export function Spinner({ size = 'sm', className, label = 'Carregando' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('animate-spin', SIZE_CLASS[size], className)}
    />
  );
}
