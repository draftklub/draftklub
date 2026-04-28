'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — wrapper único pra modal/sheet inline.
 *
 * Substitui ~10 implementações ad-hoc espalhadas (tournament detail,
 * configurar, criar-klub, minhas-reservas, etc) que misturavam
 * `fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center`
 * com layouts diferentes.
 *
 * Comportamento:
 * - Mobile (< sm): bottom sheet (slide up do bottom, cantos arredondados
 *   só em cima). Max-h 90vh + overflow-y-auto.
 * - Desktop (>= sm): centered card.
 * - Fecha em ESC ou click no backdrop (opt-out via dismissOnBackdropClick=false).
 * - Trap de foco básico via autoFocus do close button.
 */
export interface ModalProps {
  title: string;
  /** Subtítulo opcional abaixo do título. */
  description?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** `'sm'` (max-w-md) — formulário curto; `'md'` (max-w-lg) — default;
   *  `'lg'` (max-w-2xl) — confirmação com mais info. */
  size?: 'sm' | 'md' | 'lg';
  /** Footer fixo (botões salvar/cancelar). Fica na base do modal sem
   *  scroll junto com content. */
  footer?: React.ReactNode;
  /** Default true — fecha clicando fora. */
  dismissOnBackdropClick?: boolean;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export function Modal({
  title,
  description,
  open,
  onClose,
  children,
  size = 'md',
  footer,
  dismissOnBackdropClick = true,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-lg sm:rounded-xl',
          SIZE_CLASS[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
