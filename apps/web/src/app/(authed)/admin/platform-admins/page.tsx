'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Role, RoleAssignmentListItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { getMe } from '@/lib/api/me';
import {
  grantPlatformAdmin,
  listPlatformRoleAssignments,
  revokePlatformRole,
} from '@/lib/api/role-assignments';
import { isPlatformOwner } from '@/lib/auth/role-helpers';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-J2b — gestão de PLATFORM_ADMIN (Owner-only).
 *
 * Owner vê lista da sua equipe platform (incluindo seu próprio Owner row),
 * pode conceder por email (quota max 3) e revogar Admins existentes. Owner
 * não pode revogar a si mesmo nem outros Owners (singleton imutável via API).
 */

const PLATFORM_ADMIN_QUOTA = 3;

export default function PlatformAdminsPage() {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [isOwner, setIsOwner] = React.useState(false);
  const [callerUserId, setCallerUserId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<RoleAssignmentListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void getMe()
      .then((me) => {
        if (cancelled) return;
        const ownerCheck = me.roleAssignments.some((r) => isPlatformOwner(r.role));
        setIsOwner(ownerCheck);
        setCallerUserId(me.id);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    setError(null);
    listPlatformRoleAssignments()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toErrorMessage(err, 'Erro ao carregar.'));
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, reload]);

  if (!authChecked) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <Shield className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h1 className="font-display text-lg font-bold">Acesso restrito</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Esta página é exclusiva pro Platform Owner.
          </p>
        </div>
      </main>
    );
  }

  const adminCount = items?.filter((i) => i.role === 'PLATFORM_ADMIN').length ?? 0;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pra Home
        </Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Administrativa
          </p>
          <h1
            className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Platform Admins
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Owner concede acesso administrativo da plataforma. Quota máxima de{' '}
            <strong>{PLATFORM_ADMIN_QUOTA}</strong> Admins ativos —{' '}
            <strong>
              {adminCount}/{PLATFORM_ADMIN_QUOTA}
            </strong>{' '}
            em uso.
          </p>
        </header>

        {message ? (
          <p className="rounded-lg border border-success/30 bg-success/5 p-3 text-[12.5px] text-success">
            <CheckCircle2 className="mr-1 inline size-3.5" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
            <AlertCircle className="mr-1 inline size-3.5" />
            {error}
          </p>
        ) : null}

        <GrantForm
          quotaReached={adminCount >= PLATFORM_ADMIN_QUOTA}
          onGranted={(msg) => {
            setMessage(msg);
            setReload((n) => n + 1);
          }}
          onError={setError}
        />

        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Equipe atual
          </h2>
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
              Sem Platform Admins ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <AssignmentRow
                    item={item}
                    canRevoke={item.role === 'PLATFORM_ADMIN' && item.userId !== callerUserId}
                    onRevoked={(msg) => {
                      setMessage(msg);
                      setReload((n) => n + 1);
                    }}
                    onError={setError}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

// ─── Grant form ─────────────────────────────────────────────────────────

function GrantForm({
  quotaReached,
  onGranted,
  onError,
}: {
  quotaReached: boolean;
  onGranted: (message: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    try {
      await grantPlatformAdmin({ email: email.trim().toLowerCase() });
      onGranted(`PLATFORM_ADMIN concedido a ${email.trim().toLowerCase()}.`);
      setEmail('');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao conceder.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-muted-foreground" />
        <h2 className="font-display text-[14px] font-bold">Adicionar Platform Admin</h2>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        O user precisa já ter conta na DraftKlub. Concedemos por email.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@dominio.com"
          disabled={quotaReached || submitting}
          className="h-10 flex-1 rounded-[10px] border border-input bg-background px-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={quotaReached || submitting || !email.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Conceder
        </button>
      </div>
      {quotaReached ? (
        <p className="text-[11.5px] text-amber-700 dark:text-amber-400">
          Quota máxima atingida. Revogue um Admin existente pra liberar slot.
        </p>
      ) : null}
    </section>
  );
}

// ─── Assignment row ─────────────────────────────────────────────────────

function AssignmentRow({
  item,
  canRevoke,
  onRevoked,
  onError,
}: {
  item: RoleAssignmentListItem;
  canRevoke: boolean;
  onRevoked: (message: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function handleRevoke() {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      await revokePlatformRole(item.id);
      onRevoked(`Acesso revogado de ${item.userEmail}.`);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao revogar.'));
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-[14px] font-bold">{item.userFullName}</p>
            <RoleBadge role={item.role} />
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.userEmail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Concedido em {new Date(item.grantedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {canRevoke ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            Revogar
          </button>
        ) : null}
      </div>

      <Modal
        title="Revogar acesso"
        description={`Revogar PLATFORM_ADMIN de ${item.userFullName} (${item.userEmail})?`}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="sm"
        dismissOnBackdropClick={!submitting}
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleRevoke()}
              disabled={submitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Revogar
            </button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted-foreground">Esta ação remove o acesso administrativo imediatamente. O usuário pode ser readicionado se necessário.</p>
      </Modal>
    </>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const isOwner = role === 'PLATFORM_OWNER';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
        isOwner
          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
          : 'bg-primary/15 text-[hsl(var(--brand-primary-600))]',
      )}
    >
      {isOwner ? 'Owner' : 'Admin'}
    </span>
  );
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
