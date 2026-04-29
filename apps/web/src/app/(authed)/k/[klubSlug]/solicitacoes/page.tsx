'use client';

import * as React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type { MembershipRequestAdminItem, MembershipRequestStatus } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import {
  approveMembershipRequest,
  listKlubMembershipRequests,
  rejectMembershipRequest,
} from '@/lib/api/membership-requests';
import { Banner } from '@/components/ui/banner';
import { Tabs } from '@/components/ui/tabs';
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
        <PageHeader
          back={{ href: `/k/${klub.slug}/dashboard`, label: 'Voltar pro Klub' }}
          title="Solicitações de entrada"
          description={
            klub.accessMode === 'private'
              ? 'Aprove ou rejeite jogadores que pediram pra entrar no Klub.'
              : 'Este Klub é aberto. Solicitações só aparecem se você mudar pra modo de aprovação manual nas configurações.'
          }
        />

        <Tabs
          tabs={[
            { id: 'pending', label: 'Pendentes' },
            { id: 'approved', label: 'Aprovadas' },
            { id: 'rejected', label: 'Rejeitadas' },
          ]}
          active={status}
          onChange={(id) => setStatus(id as MembershipRequestStatus)}
        />

        {actionMessage ? (
          <Banner tone="success">{actionMessage}</Banner>
        ) : null}

        {error ? (
          <Banner tone="error">{error}</Banner>
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
            <h3 className="font-display text-sm font-bold leading-tight">
              {item.user.fullName}
            </h3>
            <RequestBadge status={item.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            <a href={`mailto:${item.user.email}`} className="underline">
              {item.user.email}
            </a>{' '}
            · {date}
          </p>
        </div>
      </div>

      <blockquote className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm leading-relaxed">
        {item.message}
      </blockquote>

      {item.attachmentUrl ? (
        <p className="mt-2 text-xs">
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
        <Banner tone="error"><strong>Motivo da rejeição:</strong> {item.rejectionReason}</Banner>
      ) : null}

      {actionError ? (
        <Banner tone="error">{actionError}</Banner>
      ) : null}

      {item.status === 'pending' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={approving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3.5 text-sm font-semibold text-white hover:bg-[hsl(142_71%_28%)] disabled:opacity-60"
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Rejeitar solicitação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {applicantName} vai receber este motivo por email.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Não conseguimos confirmar sua matrícula. Entre em contato com a secretaria."
          rows={4}
          maxLength={500}
          className="mt-3 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {reason.trim().length}/500 (mín 10)
        </p>
        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={reason.trim().length < 10 || submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Rejeitar
          </button>
        </div>
      </div>
    </div>
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
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      {label}
    </span>
  );
}
