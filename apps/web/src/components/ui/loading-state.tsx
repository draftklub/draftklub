import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

/**
 * Sprint M batch SM-4 — Loading state padronizado.
 *
 * Substitui o pattern manual:
 *   <div className="flex items-center justify-center py-10">
 *     <Loader2 className="size-5 animate-spin text-muted-foreground" />
 *   </div>
 *
 * Por:
 *   <LoadingState />
 *
 * `inline` permite usar inline (sem padding/full-width) em casos onde
 * o spinner aparece dentro de um card ou form.
 */
export interface LoadingStateProps {
  /** Texto opcional abaixo do spinner. */
  label?: string;
  /** Inline = sem padding nem center. Default false (centraliza com py-10). */
  inline?: boolean;
  className?: string;
}

export function LoadingState({ label, inline = false, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        inline
          ? 'inline-flex items-center gap-2'
          : 'flex flex-col items-center justify-center py-10 gap-2',
        className,
      )}
    >
      <Spinner size="lg" className="text-muted-foreground" label={label ?? 'Carregando'} />
      {label && !inline ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  );
}
