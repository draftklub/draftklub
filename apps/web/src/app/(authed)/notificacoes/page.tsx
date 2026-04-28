'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Bell, CheckCircle2, Loader2, Swords, XCircle } from 'lucide-react';
import type { PendingMatchConfirmationItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { confirmCasualMatch, listPendingMatchConfirmations } from '@/lib/api/rankings';
import { cn } from '@/lib/utils';

/**
 * Sprint K PR-K5b — converte o stub de notificações em página real,
 * focada em **partidas que aguardam minha confirmação**. Backend
 * agora expõe `GET /me/pending-match-confirmations` (PR-K5a).
 *
 * Itens vêm de matches casuais (player_with_confirm casual) e de
 * torneio em modo player_with_confirm. Confirmar manda `POST
 * /matches/:id/confirm` (mesma rota pra ambos source).
 *
 * No futuro essa página vai ganhar mais tipos (in-app notifications
 * com `is_read`, push events, etc) — base aqui já abstrai.
 */
export default function NotificacoesPage() {
  const [items, setItems] = React.useState<PendingMatchConfirmationItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    listPendingMatchConfirmations()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar notificações.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pra Home
        </Link>

        <header>
          <h1
            className="font-display text-[26px] font-bold leading-tight md:text-[32px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Notificações
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Partidas reportadas pelo seu rival aguardando sua confirmação.
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
        ) : null}

        {items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Bell className="size-5" />
            </div>
            <p className="mt-3 font-display text-[14px] font-bold">Nada pra confirmar</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Você está em dia. Quando alguém reportar partida com você, aparece aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.matchId}>
                <PendingItemCard
                  item={item}
                  onConfirmed={(msg) => {
                    setActionMessage(msg);
                    setError(null);
                    setReload((n) => n + 1);
                  }}
                  onError={(msg) => {
                    setError(msg);
                    setActionMessage(null);
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="text-[11.5px] text-muted-foreground">
          Outras notificações (booking confirmado, lembrete 24h, solicitação de entrada) ainda
          chegam por <strong>email</strong>. Ajusta preferências em{' '}
          <Link href="/perfil" className="text-primary hover:underline">
            perfil
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function PendingItemCard({
  item,
  onConfirmed,
  onError,
}: {
  item: PendingMatchConfirmationItem;
  onConfirmed: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  const winnerName =
    item.winnerId === item.player1Id
      ? item.player1Name
      : item.winnerId === item.player2Id
        ? item.player2Name
        : null;

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirmCasualMatch(item.matchId);
      onConfirmed(`Resultado confirmado contra ${item.submittedByName}.`);
    } catch (err: unknown) {
      onError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao confirmar.',
      );
      setSubmitting(false);
    }
  }

  return (
    <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Swords className="size-4 text-amber-700 dark:text-amber-400" />
        <span className="inline-flex h-5 items-center rounded-full bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
          Aguarda confirmação
        </span>
        {item.tournamentName ? (
          <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[hsl(var(--brand-primary-600))]">
            Torneio
          </span>
        ) : (
          <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Casual
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-[14px] font-bold">
        {item.player1Name} <span className="text-muted-foreground">vs</span> {item.player2Name}
      </p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Reportado por <strong>{item.submittedByName}</strong> em{' '}
        {new Date(item.playedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        · {item.rankingName}
        {item.tournamentName ? ` · ${item.tournamentName}` : ''}
      </p>
      <p className="mt-1.5 text-[12.5px]">
        Vencedor:{' '}
        <strong className={cn(winnerName ? 'text-foreground' : 'text-muted-foreground')}>
          {winnerName ?? '—'}
        </strong>
        {item.score ? (
          <span className="ml-2 font-mono text-muted-foreground">({item.score})</span>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] px-2.5 text-[12px] font-semibold text-[hsl(142_71%_32%)] hover:bg-[hsl(142_71%_32%/0.1)] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3" />
          )}
          Confirmar
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-muted-foreground opacity-60"
          title="Disputa virá em sprint futura"
        >
          <XCircle className="size-3" />
          Disputar
        </button>
      </div>
    </article>
  );
}
