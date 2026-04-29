'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Sprint M batch SM-9 — Tooltip via Radix.
 *
 * Uso:
 *   <Tooltip content="Pré-qualificatória: jogo eliminatório antes da chave principal">
 *     <button>Pré-qualificatória</button>
 *   </Tooltip>
 *
 * Provider montado no root (RootLayout) — single instance pra toda
 * a árvore. Acessível via teclado (Tab + hover automático em focus).
 */

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Atraso de hover antes de abrir (ms). Default 200. */
  delayDuration?: number;
  /** 'top' | 'right' | 'bottom' | 'left'. Default 'top'. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Off vs preferência (Radix collision-aware). */
  sideOffset?: number;
  /** Quebra de linha em conteúdo longo. */
  className?: string;
}

export function Tooltip({
  content,
  children,
  delayDuration = 200,
  side = 'top',
  sideOffset = 6,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          className={cn(
            'z-50 max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg',
            'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
            'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1',
            'data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;
