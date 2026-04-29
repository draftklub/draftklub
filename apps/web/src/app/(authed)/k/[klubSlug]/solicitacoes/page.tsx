'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { MembershipRequestAdminItem, MembershipRequestStatus } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import {
  approveMembershipRequest,
  listKlubMembershipRequests,
  rejectMembershipRequest,
} from '@/lib/api/membership-requests';
import { cn } from '@/lib/utils';

/**
 * Sprint C PR2 — fila de solicitações de entrada (KLUB_ADMIN/SPORTS_COMMITTEE).
 * Aparece só pra Klubs `accessMode='private'` mas a página em si funciona pra
 * qualquer Klub (lista vazia se não há solicitações).
 */
export default function SolicitacoesPage() {
  const { klub } = useActiveKlub();
  const [status, setStatus] = React.useState<MembershipRequestStatus>('pending');
  const [items, setItems] = React.useState<MembershipRequestAdminItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubMembershipRequests(klub.id, { status })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, status, reloadToken]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar pro Klub
        </Link>

        <header>
          <h1
            className="font-display text-[28px] font-bold md:text-[32px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Solicitações de entrada
          </h1>
          <p className="mt-2 text-[14.5px] text-muted-foreground">
            {klub.accessMode === 'private'
              ? 'Aprove ou rejeite jogadores que pediram pra entrar no Klub.'
              : 'Este Klub é aberto. Solicitações só aparecem se você mudar pra modo de aprovação manual nas configurações.'}
          </p>
        </header>

        <div className="flex gap-1 border-b border-border">
          <TabButton
            active={status === 'pending'}
            onClick={() => setStatus('pending')}
            label="Pendentes"
          />
          <TabButton
            active={status === 'approved'}
            onClick={() => setStatus('approved')}
            label="Aprovadas"
          />
          <TabButton
            active={status === 'rejected'}
            onClick={() => setStatus('rejected')}
            label="Rejeitadas"
          />
        </div>

        {actionMessage ? (
          <p className="rounded-lg border border-success/30 bg-success/5 p-3 text-[13px] text-success">
            <CheckCircle2 className="mr-1 inline size-3.5" />
            {actionMessage}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-display text-base font-bold">
              Nada{' '}
              {status === 'pending' ? 'pendente' : status === 'approved' ? 'aprovado' : 'rejeitado'}
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <RequestCard
                  item={item}
                  klubId={klub.id}
                  onActed={(msg) => {
                    setActionMessage(msg);
                    setReloadToken((n) => n + 1);
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

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center border-b-2 px-3 text-[13px] font-semibold transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function RequestCard({
  item,
  klubId,
  onActed,
}: {
  item: MembershipRequestAdminItem;
  klubId: string;
  onActed: (message: string) => void;
}) {
  const [approving, setApproving] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const date = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  async function handleApprove() {
    if (approving) return;
    setApproving(true);
    setActionError(null);
    try {
      await approveMembershipRequest(klubId, item.id);
      onActed(`${item.user.fullName} agora é jogador do Klub.`);
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao aprovar.',
      );
      setApproving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserAvatar name={item.user.fullName} url={item.user.avatarUrl} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15px] font-bold leading-tight">
              {item.user.fullName}
            </h3>
            <RequestBadge status={item.status} />
          </div>
          <p className="text-[12px] text-muted-foreground">
            <a href={`mailto:${item.user.email}`} className="underline">
              {item.user.email}
            </a>{' '}
            · {date}
          </p>
        </div>
      </div>

      <blockquote className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-[13.5px] leading-relaxed">
        {item.message}
      </blockquote>

      {item.attachmentUrl ? (
        <p className="mt-2 text-[12px]">
          Anexo:{' '}
          <a
            href={item.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(var(--brand-primary-600))] underline"
          >
            {item.attachmentUrl}
          </a>
        </p>
      ) : null}

      {item.rejectionReason ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
          <strong>Motivo da rejeição:</strong> {item.rejectionReason}
        </p>
      ) : null}

      {actionError ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
          {actionError}
        </p>
      ) : null}

      {item.status === 'pending' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={approving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3.5 text-[13px] font-semibold text-white hover:bg-[hsl(142_71%_28%)] disabled:opacity-60"
          >
            {approving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 text-[13px] font-semibold text-destructive hover:bg-destructive/10"
          >
            <X className="size-3.5" />
            Rejeitar
          </button>
        </div>
      ) : null}

      {rejectModalOpen ? (
        <RejectModal
          klubId={klubId}
          requestId={item.id}
          applicantName={item.user.fullName}
          onClose={() => setRejectModalOpen(false)}
          onRejected={() => {
            setRejectModalOpen(false);
            onActed('Solicitação rejeitada.');
          }}
        />
      ) : null}
    </div>
  );
}

function RejectModal({
  klubId,
  requestId,
  applicantName,
  onClose,
  onRejected,
}: {
  klubId: string;
  requestId: string;
  applicantName: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await rejectMembershipRequest(klubId, requestId, reason.trim());
      onRejected();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erro.',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Rejeitar solicitação"
      description={`${applicantName} vai receber este motivo por email.`}
      open
      onClose={onClose}
      size="sm"
      dismissOnBackdropClick={!submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={reason.trim().length < 10 || submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Rejeitar
          </button>
        </>
      }
    >
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Ex: Não conseguimos confirmar sua matrícula. Entre em contato com a secretaria."
        rows={4}
        maxLength={500}
        className="w-full rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
      />
      <p className="mt-1 text-right text-[11px] text-muted-foreground">
        {reason.trim().length}/500 (mín 10)
      </p>
      {error ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function UserAvatar({ name, url }: { name: string; url: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-base font-bold text-white"
      style={
        url
          ? {
              backgroundImage: `url(${url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { background: `hsl(${hue} 55% 42%)` }
      }
      aria-label={name}
    >
      {url ? null : initial}
    </span>
  );
}

function RequestBadge({ status }: { status: MembershipRequestStatus }) {
  const tone =
    status === 'pending'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      : status === 'approved'
        ? 'bg-success/12 text-success'
        : status === 'rejected'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground';
  const label =
    status === 'pending'
      ? 'Pendente'
      : status === 'approved'
        ? 'Aprovada'
        : status === 'rejected'
          ? 'Rejeitada'
          : 'Cancelada';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      {label}
    </span>
  );
}
