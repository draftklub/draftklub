'use client';

import * as React from 'react';
import { Modal } from './modal';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

/**
 * Sprint M batch SM-6 — ConfirmDialog wrapping Modal.
 *
 * Substitui `window.confirm()` (não estilizável, fora do design system,
 * bloqueia main thread). API declarativa simples — cada caller mantém
 * seu próprio useState pra abertura.
 *
 * Uso:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     title="Revogar acesso"
 *     description={`Revogar PLATFORM_ADMIN de ${user.email}?`}
 *     destructive
 *     onConfirm={async () => { await revokeRole(id); }}
 *   />
 *   <button onClick={() => setOpen(true)}>Revogar</button>
 */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** Texto do botão de confirmação. Default 'Confirmar'. */
  confirmLabel?: string;
  /** Texto do botão de cancelamento. Default 'Cancelar'. */
  cancelLabel?: string;
  /** Tinge o botão confirm de vermelho (delete/revoke/etc). */
  destructive?: boolean;
  /** Async — Modal fecha após resolve. Erros propagam pro caller tratar. */
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={title}
      description={typeof description === 'string' ? description : undefined}
      open={open}
      onClose={submitting ? () => undefined : onClose}
      size="sm"
    >
      {typeof description !== 'string' && description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className={cn(
            'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-60',
            destructive
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {submitting ? <Spinner size="sm" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
