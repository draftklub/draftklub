import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Sprint O batch O-1 — Badge consolidado.
 *
 * Substitui ~30 spans ad-hoc com shape
 * `inline-flex h-5 items-center rounded-full bg-{tone}/X px-2 text-xs
 * font-bold uppercase tracking-[0.06em] text-{tone}-foreground` espalhados
 * em status pills (booking pending, tournament cancelled/finished,
 * notification unread, role labels, etc).
 *
 * Variants seguem semantic tokens — `tone` mapeia pra cores de estado
 * (warning/destructive/success/neutral). Uppercase + tracking compactado
 * são padrão pro look "label/etiqueta" usado no app; passe `subtle`
 * pra desativar quando contexto pede badge mais informal (numérico,
 * count).
 */
export type BadgeTone = 'neutral' | 'warning' | 'destructive' | 'success' | 'primary';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Default badge é uppercase+bold+tracking (status label).
   *  `subtle` desliga: useado pra badges numéricos/contadores. */
  subtle?: boolean;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/15 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success/12 text-success',
  primary: 'bg-primary/12 text-primary',
};

export function Badge({
  tone = 'neutral',
  subtle = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs',
        subtle ? 'font-medium' : 'font-bold uppercase tracking-[0.06em]',
        TONE_CLASS[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
