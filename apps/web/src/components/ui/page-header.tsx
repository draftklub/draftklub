import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sprint L PR-L1 — header padrão de página interna.
 *
 * Substitui o padrão repetido em ~30 páginas:
 *   <Link href="..." className="inline-flex...">
 *     <ArrowLeft /> Voltar pra X
 *   </Link>
 *   <header>
 *     <p className="text-xs font-bold uppercase...">Eyebrow</p>
 *     <h1 className="font-display text-2xl md:text-3xl...">Title</h1>
 *     <p className="text-sm text-muted-foreground">Description</p>
 *   </header>
 *
 * Aceita slot de action (CTA tipo "Criar" no header).
 */
export interface PageHeaderProps {
  /** Texto pequeno acima do título (ex: "Klub Paissandú · Tênis"). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Se passar string, renderiza um back-link com ArrowLeft. Se passar
   *  ReactNode (ex: outro componente Link), renderiza esse direto. */
  back?: { href: string; label: string } | React.ReactNode;
  /** CTA do header (ex: <Button>Criar</Button>). */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {back ? <BackSlot back={back} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-primary-600">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function BackSlot({ back }: { back: NonNullable<PageHeaderProps['back']> }) {
  if (typeof back === 'object' && back !== null && 'href' in back && 'label' in back) {
    return (
      <Link
        href={back.href}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {back.label}
      </Link>
    );
  }
  return <>{back}</>;
}
