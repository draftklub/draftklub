import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — wrapper único pra label + input + hint + erro.
 *
 * Substitui ~100 cópias de:
 *   <div>
 *     <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
 *       Label
 *     </label>
 *     <input ... />
 *     {help ? <p className="mt-1 text-[11px] text-muted-foreground">{help}</p> : null}
 *   </div>
 *
 * Aceita qualquer children (input/select/textarea/custom). Não controla
 * o input — só wrap visual. Estados: hint normal, error (substitui hint
 * + colore label).
 */
export interface FormFieldProps {
  label: string;
  /** Mostra * vermelho ao lado da label. */
  required?: boolean;
  /** Mensagem de ajuda em estado neutro. Some quando há `error`. */
  hint?: React.ReactNode;
  /** Quando preenchido, override hint + colore label/border. */
  error?: string | null;
  /** Field horizontal (label esquerda, input direita) — pra forms compactos
   *  tipo settings. Default vertical (label em cima). */
  layout?: 'vertical' | 'horizontal';
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  hint,
  error,
  layout = 'vertical',
  children,
  className,
}: FormFieldProps) {
  if (layout === 'horizontal') {
    return (
      <div
        className={cn(
          'grid grid-cols-[120px_1fr] items-start gap-3 sm:grid-cols-[160px_1fr]',
          className,
        )}
      >
        <label
          className={cn(
            'pt-2 text-xs font-bold uppercase tracking-[0.06em]',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </label>
        <div className="min-w-0 space-y-1">
          {children}
          <FieldFootnote hint={hint} error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <label
        className={cn(
          'block text-xs font-bold uppercase tracking-[0.06em]',
          error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      <FieldFootnote hint={hint} error={error} />
    </div>
  );
}

function FieldFootnote({ hint, error }: { hint?: React.ReactNode; error?: string | null }) {
  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>;
  return null;
}
