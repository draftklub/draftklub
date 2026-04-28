import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, type LucideIcon, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — banner inline pra info/sucesso/warning/erro.
 *
 * Substitui hard-coded `[hsl(142_71%_32%/0.05)]` (success), amber-500
 * (warning), `bg-destructive/5` (error), `bg-primary/5` (info)
 * espalhados pelas páginas. Usa cores semânticas adicionadas em
 * globals.css (`--success`, `--warning`).
 *
 * NÃO é toast (efêmero). É feedback persistente até user dismissar
 * ou re-render.
 */
export type BannerTone = 'info' | 'success' | 'warning' | 'error';

export interface BannerProps {
  tone: BannerTone;
  /** Título curto (1 linha). Opcional — sem title vira só descrição inline. */
  title?: string;
  children?: React.ReactNode;
  /** Ícone custom; default escolhido por tone. */
  icon?: LucideIcon;
  className?: string;
}

const TONE_CLASSES: Record<BannerTone, { container: string; icon: string }> = {
  info: {
    container:
      'border border-[hsl(var(--ring)_/_0.3)] bg-[hsl(var(--ring)_/_0.05)] text-foreground',
    icon: 'text-[hsl(var(--ring))]',
  },
  success: {
    container: 'border border-success/30 bg-success/5 text-foreground',
    icon: 'text-success',
  },
  warning: {
    container: 'border border-warning/40 bg-warning/10 text-foreground',
    icon: 'text-[hsl(var(--warning-foreground))] dark:text-warning',
  },
  error: {
    container: 'border border-destructive/40 bg-destructive/5 text-foreground',
    icon: 'text-destructive',
  },
};

const TONE_ICONS: Record<BannerTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function Banner({ tone, title, children, icon, className }: BannerProps) {
  const ToneIcon = icon ?? TONE_ICONS[tone];
  const { container, icon: iconClass } = TONE_CLASSES[tone];
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg p-3 text-sm', container, className)}
    >
      <ToneIcon className={cn('mt-0.5 size-4 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold leading-tight">{title}</p> : null}
        {children ? (
          <div className={cn('text-sm', title && 'mt-0.5 text-muted-foreground')}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
