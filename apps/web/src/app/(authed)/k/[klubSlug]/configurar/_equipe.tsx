'use client';

/**
 * Sprint O batch O-7 — EquipeTab extraída de _components.tsx.
 * Cobre: EquipeTab, TransferAdminSection, EquipeGrantForm, EquipeRow,
 * KlubRoleBadge.
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Plus, Power, Trash2, UserPlus, Users } from 'lucide-react';
import type { Klub, KlubSportProfile, Role, RoleAssignmentListItem } from '@draftklub/shared-types';
import { grantKlubRole, listKlubRoleAssignments, revokeKlubRole } from '@/lib/api/role-assignments';
import { listKlubSports } from '@/lib/api/sports';
import { getIdToken } from '@/lib/auth';
import { transferAdminAction } from '@/lib/actions/transfer-admin';
import { transferAdminSchema, type TransferAdminInput } from '@/lib/schemas/transfer-admin';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import { inputCls, toErrorMessage } from './_form-helpers';

// ─── Equipe tab (PR-J2b) ─────────────────────────────────────────────────

const KLUB_GRANTABLE_ROLES: {
  value: 'KLUB_ASSISTANT' | 'SPORT_COMMISSION' | 'SPORT_STAFF';
  label: string;
  hint: string;
}[] = [
  {
    value: 'KLUB_ASSISTANT',
    label: 'Klub Assistant',
    hint: 'Mesma capacidade do Admin, exceto mexer em roles do Admin.',
  },
  {
    value: 'SPORT_COMMISSION',
    label: 'Sport Commission',
    hint: 'Organiza torneios, ranking e match da modalidade.',
  },
  {
    value: 'SPORT_STAFF',
    label: 'Sport Staff',
    hint: 'Operação dia-a-dia: cria/aprova/cancela bookings.',
  },
];

export function EquipeTab({ klub, canTransferAdmin }: { klub: Klub; canTransferAdmin: boolean }) {
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const {
    data,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['equipe-tab', klub.id],
    queryFn: async () => {
      const [rows, sportsList] = await Promise.all([
        listKlubRoleAssignments(klub.id),
        listKlubSports(klub.id),
      ]);
      return { items: rows, sports: sportsList };
    },
  });

  const items = data?.items ?? null;
  const sports = data?.sports ?? [];
  const fetchErrorMsg = fetchError ? toErrorMessage(fetchError, 'Erro ao carregar equipe.') : null;
  const error = fetchErrorMsg ?? mutationError;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-sm font-bold">Equipe</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Conceda roles operacionais (Assistant, Sport Commission, Sport Staff). Transfira
          KLUB_ADMIN pra outro membro abaixo se for o caso.
        </p>
      </header>

      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      <EquipeGrantForm
        klubId={klub.id}
        sports={sports}
        onGranted={(msg) => {
          setMessage(msg);
          setMutationError(null);
          void refetch();
        }}
        onError={setMutationError}
      />

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Equipe atual
        </h3>
        {items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sem roles operacionais ainda"
            description="Você ainda é o único admin desse Klub."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <EquipeRow
                  klubId={klub.id}
                  item={item}
                  sports={sports}
                  onRevoked={(msg) => {
                    setMessage(msg);
                    setMutationError(null);
                    void refetch();
                  }}
                  onError={setMutationError}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {canTransferAdmin ? (
        <TransferAdminSection
          klubId={klub.id}
          klubName={klub.name}
          klubSlug={klub.slug}
          onTransferred={(msg) => {
            setMessage(msg);
            setMutationError(null);
            void refetch();
          }}
          onError={setMutationError}
        />
      ) : null}
    </div>
  );
}

function TransferAdminSection({
  klubId,
  klubName,
  klubSlug,
  onTransferred,
  onError,
}: {
  klubId: string;
  klubName: string;
  klubSlug: string;
  onTransferred: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransferAdminInput>({ resolver: zodResolver(transferAdminSchema) });

  async function onSubmit({ email }: TransferAdminInput) {
    const target = email.trim().toLowerCase();
    const confirmMsg =
      `Transferir KLUB_ADMIN de "${klubName}" para ${target}?\n\n` +
      `Você sai LIMPO desse Klub: zero role administrativa. Continuará membro/sócio se já era. ` +
      `Apenas o novo admin pode te readmitir como Assistant.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');
      await transferAdminAction(token, klubId, { email: target });
      onTransferred(`Klub Admin transferido pra ${target}.`);
      setTimeout(() => router.replace(`/k/${klubSlug}/dashboard`), 1500);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao transferir admin.'));
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 text-warning-foreground" />
        <h3 className="font-display text-sm font-bold">Transferir Klub Admin</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Passa o controle deste Klub pra outro membro. Você <strong>sai limpo</strong> da
        administração — zero role. Membership/sócio permanece. Target precisa já ser membro ativo do
        Klub.
      </p>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="flex-1">
          <input
            type="email"
            {...register('email')}
            placeholder="email-do-novo-admin@dominio.com"
            disabled={isSubmitting}
            className={inputCls}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-warning bg-warning/10 px-4 text-sm font-semibold text-warning-foreground hover:bg-warning/20 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Power className="size-3.5" />
          )}
          Transferir
        </button>
      </form>
    </section>
  );
}

function EquipeGrantForm({
  klubId,
  sports,
  onGranted,
  onError,
}: {
  klubId: string;
  sports: KlubSportProfile[];
  onGranted: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'KLUB_ASSISTANT' | 'SPORT_COMMISSION' | 'SPORT_STAFF'>(
    'KLUB_ASSISTANT',
  );
  const [scopeSportId, setScopeSportId] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  const isSportRole = role === 'SPORT_COMMISSION' || role === 'SPORT_STAFF';
  const roleHint = KLUB_GRANTABLE_ROLES.find((r) => r.value === role)?.hint;

  async function handleSubmit() {
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    try {
      await grantKlubRole(klubId, {
        email: email.trim().toLowerCase(),
        role,
        ...(isSportRole && scopeSportId ? { scopeSportId } : {}),
      });
      onGranted(`Role ${role} concedida a ${email.trim().toLowerCase()}.`);
      setEmail('');
      setScopeSportId('');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao conceder role.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-bold">Adicionar membro</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dominio.com"
            disabled={submitting}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'KLUB_ASSISTANT' | 'SPORT_COMMISSION' | 'SPORT_STAFF')
            }
            disabled={submitting}
            className={inputCls}
          >
            {KLUB_GRANTABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {isSportRole && sports.length > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Modalidade (opcional)
          </label>
          <select
            value={scopeSportId}
            onChange={(e) => setScopeSportId(e.target.value)}
            disabled={submitting}
            className={inputCls}
          >
            <option value="">Todas as modalidades do Klub</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.sportCode}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {roleHint ? <p className="text-xs text-muted-foreground">{roleHint}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !email.trim()}
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
    </section>
  );
}

function EquipeRow({
  klubId,
  item,
  sports,
  onRevoked,
  onError,
}: {
  klubId: string;
  item: RoleAssignmentListItem;
  sports: KlubSportProfile[];
  onRevoked: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const sportName = item.scopeSportId
    ? (sports.find((s) => s.id === item.scopeSportId)?.name ?? null)
    : null;

  async function handleRevoke() {
    if (submitting) return;
    if (!window.confirm(`Revogar ${item.role} de ${item.userFullName} (${item.userEmail})?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await revokeKlubRole(klubId, item.id);
      onRevoked(`Acesso revogado de ${item.userEmail}.`);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao revogar.'));
      setSubmitting(false);
    }
  }

  const canRevoke = item.role !== 'KLUB_ADMIN';

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-sm font-bold">{item.userFullName}</p>
          <KlubRoleBadge role={item.role} />
          {sportName ? (
            <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {sportName}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.userEmail}</p>
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

function KlubRoleBadge({ role }: { role: Role }) {
  const map: Record<string, string> = {
    KLUB_ADMIN: 'Klub Admin',
    KLUB_ASSISTANT: 'Klub Assistant',
    SPORT_COMMISSION: 'Sport Commission',
    SPORT_STAFF: 'Sport Staff',
  };
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-xs font-bold uppercase tracking-[0.06em] text-brand-primary-600">
      {map[role] ?? role}
    </span>
  );
}
