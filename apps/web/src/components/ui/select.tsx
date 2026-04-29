import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Sprint O batch O-2 — Select consolidado.
 *
 * Wrapper sobre native `<select>` que padroniza className (mesma look do
 * Input primitive). Substitui ~27 instâncias com classes copiadas linha
 * a linha (`h-11 w-full rounded-md border border-input bg-background
 * px-3.5 text-sm outline-none focus-visible:border-primary
 * focus-visible:ring-[3px] focus-visible:ring-primary/20`).
 *
 * Decisão técnica: native select (não Radix Combobox) porque:
 * - Mobile-first: native traz date picker / wheel selector do OS,
 *   melhor UX em iOS/Android
 * - Sem deps adicionais
 * - A11y vem de graça (keyboard nav, screen reader)
 *
 * Quando precisar busca/filter/multi-select dentro do dropdown, evolua
 * pra Combobox (Radix) num primitivo separado — não tente espremer
 * features aqui.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Tamanho. `md` (default, h-11) é form padrão; `sm` (h-9) é toolbar. */
  inputSize?: 'sm' | 'md';
}

const SIZE_CLASS: Record<NonNullable<SelectProps['inputSize']>, string> = {
  sm: 'h-9 px-2.5',
  md: 'h-11 px-3.5',
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { inputSize = 'md', className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-input bg-background text-sm outline-none transition-colors',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        SIZE_CLASS[inputSize],
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
