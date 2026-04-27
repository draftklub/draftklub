'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import {
  approveExtension,
  listPendingExtensions,
  rejectExtension,
  type PendingExtensionItem,
} from '@/lib/api/bookings';

/**
 * Sprint Polish PR-C — admin page: lista extensões pendentes do Klub
 * pra aprovação. Acessível só pra KLUB_ADMIN/STAFF (backend bloqueia
 * via RequirePolicy 'booking.approve').
 */
export default function ExtensionsPendingPage() {
  const { klub } = useActiveKlub();
  const [items, setItems] = React.useState<PendingExtensionItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listPendingExtensions(klub.id)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar extensões.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, reload]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pro Klub
        </Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Admin · {klub.name}
          </p>
          <h1
            className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Extensões pendentes
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Players solicitaram estender reservas — aprove ou rejeite.
          </p>
        </header>

        {actionMessage ? (
          <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
            <CheckCircle2 className="mr-1 inline size-3.5" />
            {actionMessage}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Timer className="size-4" />
            </div>
            <p className="mt-3 font-display text-[14px] font-bold">Nada pendente</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Não há extensões aguardando decisão agora.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={`${it.bookingId}-${it.extension.id}`}>
                <ExtensionCard
                  item={it}
                  onActed={(msg) => {
                    setActionMessage(msg);
                    setReload((n) => n + 1);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ExtensionCard({
  item,
  onActed,
}: {
  item: PendingExtensionItem;
  onActed: (msg: string) => void;
}) {
  const [busy, setBusy] = React.useState<'approve' | 'reject' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const start = new Date(item.startsAt);
  const from = new Date(item.extension.extendedFrom);
  const to = new Date(item.extension.extendedTo);
  const date = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const fromLabel = from.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const toLabel = to.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const additionalMinutes = Math.round((to.getTime() - from.getTime()) / 60_000);

  async function handleApprove() {
    if (busy) return;
    setBusy('approve');
    setError(null);
    try {
      await approveExtension(item.bookingId, item.extension.id);
      onActed('Extensão aprovada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar.');
      setBusy(null);
    }
  }

  async function handleReject() {
    if (busy) return;
    const reason = window.prompt('Motivo da rejeição (opcional)');
    if (reason === null) return;
    setBusy('reject');
    setError(null);
    try {
      await rejectExtension(item.bookingId, item.extension.id, reason || undefined);
      onActed('Extensão rejeitada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar.');
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[15px] font-bold">{item.spaceName ?? 'Quadra'}</h3>
        <span className="inline-flex h-5 items-center rounded-full bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
          +{additionalMinutes}min
        </span>
      </div>
      <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 capitalize">
          <CalendarDays className="size-3" />
          {date}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {fromLabel} → {toLabel}
        </span>
      </p>
      <p className="mt-2 text-[13px]">
        <span className="text-muted-foreground">Solicitado por:</span>{' '}
        <span className="font-semibold">{item.requestedByName ?? 'desconhecido'}</span>
      </p>
      {item.extension.decisionReason ? (
        <p className="mt-1 rounded-md border-l-2 border-primary/30 bg-muted/40 px-2 py-1 text-[12px] text-muted-foreground">
          {item.extension.decisionReason}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => void handleApprove()}
          disabled={busy !== null}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy === 'approve' ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => void handleReject()}
          disabled={busy !== null}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          {busy === 'reject' ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
          Rejeitar
        </button>
      </div>
    </div>
  );
}
