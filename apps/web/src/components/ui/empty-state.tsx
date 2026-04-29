import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — empty state padronizado.
 *
 * Substitui 15+ implementações ad-hoc do tipo:
 *   <div className="rounded-xl border border-dashed border-border p-8 text-center">
 *     <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
 *       <Icon className="size-4" />
 *     </div>
 *     <p className="mt-3 font-display text-sm font-bold">Title</p>
 *     <p className="mt-1 text-xs text-muted-foreground">Description</p>
 *   </div>
 *
 * Use quando uma lista/tabela/seção está vazia e há contexto pro user
 * sobre o que fazer (ou nada a fazer).
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA opcional — botão ou Link já estilizado. */
  action?: React.ReactNode;
  /** Tom — default neutro; 'subtle' menos chamativo (sem border-dashed). */
  tone?: 'default' | 'subtle';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-8 text-center',
        tone === 'default' ? 'border border-dashed border-border' : 'bg-muted/30',
        className,
      )}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 font-display text-base font-bold">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
