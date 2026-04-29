'use client';

import { Toaster, toast } from 'sonner';

/**
 * Sprint M batch SM-9 — Toast primitivo via Sonner.
 *
 * Uso:
 *   import { toast } from '@/components/ui/toast';
 *   toast.success('Booking criado');
 *   toast.error('Falha ao salvar', { description: err.message });
 *   toast('Genérico');
 *   toast.promise(operation, { loading: '...', success: '...', error: '...' });
 *
 * `<ToastProvider />` é montado uma vez no root layout. Custom theming
 * via CSS vars do design system (tokens `--card`, `--border`, etc).
 */
export { toast };

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  );
}
