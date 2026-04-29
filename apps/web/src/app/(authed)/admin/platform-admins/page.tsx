'use client';

import * as React from 'react';
import { Loader2, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import type { Role, RoleAssignmentListItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { getMe } from '@/lib/api/me';
import {
  grantPlatformAdmin,
  listPlatformRoleAssignments,
  revokePlatformRole,
} from '@/lib/api/role-assignments';
import { isPlatformOwner } from '@/lib/auth/role-helpers';
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
          <p className="mt-2 text-sm text-muted-foreground">
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
        <PageHeader
          back={{ href: '/home', label: 'Voltar pra Home' }}
          eyebrow="Administrativa"
          title="Platform Admins"
          description={
            <>
              Owner concede acesso administrativo da plataforma. Quota máxima de{' '}
              <strong>{PLATFORM_ADMIN_QUOTA}</strong> Admins ativos —{' '}
              <strong>
                {adminCount}/{PLATFORM_ADMIN_QUOTA}
              </strong>{' '}
              em uso.
            </>
          }
        />

        {message ? <Banner tone="success">{message}</Banner> : null}
        {error ? <Banner tone="error">{error}</Banner> : null}

        <GrantForm
          quotaReached={adminCount >= PLATFORM_ADMIN_QUOTA}
          onGranted={(msg) => {
            setMessage(msg);
            setReload((n) => n + 1);
          }}
          onError={setError}
        />

        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Equipe atual
          </h2>
          {items === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Shield} title="Sem Platform Admins ainda." />
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
        <h2 className="font-display text-sm font-bold">Adicionar Platform Admin</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        O user precisa já ter conta na DraftKlub. Concedemos por email.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@dominio.com"
          disabled={quotaReached || submitting}
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={quotaReached || submitting || !email.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
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
        <p className="text-xs text-warning-foreground">
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

  async function handleRevoke() {
    if (submitting) return;
    if (!window.confirm(`Revogar PLATFORM_ADMIN de ${item.userFullName} (${item.userEmail})?`)) {
      return;
    }
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-sm font-bold">{item.userFullName}</p>
          <RoleBadge role={item.role} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.userEmail}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Concedido em {new Date(item.grantedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
      {canRevoke ? (
        <button
          type="button"
          onClick={() => void handleRevoke()}
          disabled={submitting}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          Revogar
        </button>
      ) : null}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const isOwner = role === 'PLATFORM_OWNER';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        isOwner ? 'bg-warning/15 text-warning-foreground' : 'bg-primary/15 text-brand-primary-600',
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
