'use client';

import * as React from 'react';
import { Check, CheckSquare, Clock, Layers, Loader2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EnrollmentStatus,
  KlubSportProfile,
  PlayerSportEnrollment,
  Role,
  UserKlubMembership,
} from '@draftklub/shared-types';
import { Topbar } from '@/components/dashboard/topbar';
import { useActiveKlub } from '@/components/active-klub-provider';
import { ApiError } from '@/lib/api/client';
import { getMe, getMyKlubs } from '@/lib/api/me';
import { listKlubSports, listSports } from '@/lib/api/sports';
import {
  approveEnrollment,
  listEnrollmentsByProfile,
  listEnrollmentsByUser,
  rejectEnrollment,
  requestEnrollment,
} from '@/lib/api/enrollments';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ADMIN_ROLES: Role[] = ['PLATFORM_OWNER', 'KLUB_ADMIN', 'SPORT_COMMISSION'];

export default function ModalidadesPage() {
  return (
    <>
      <Topbar subtitle="Modalidades · inscrições" />
      <ModalidadesScreen />
    </>
  );
}

function ModalidadesScreen() {
  const { klub } = useActiveKlub();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<'all' | 'pending'>('all');
  const [mutationError, setMutationError] = React.useState<string | null>(null);

  const {
    data,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['modalidades-screen', klub?.id],
    queryFn: async () => {
      if (!klub) throw new Error('unreachable');
      const [me, myKlubs, klubProfiles, sportCatalog] = await Promise.all([
        getMe(),
        getMyKlubs(),
        listKlubSports(klub.id),
        listSports(),
      ]);
      const myMembership = myKlubs.find((k: UserKlubMembership) => k.klubId === klub.id);
      const ml = await listEnrollmentsByUser(me.id);
      return {
        userId: me.id,
        role: myMembership?.role ?? null,
        profiles: klubProfiles,
        catalog: sportCatalog,
        myEnrollments: ml,
      };
    },
    enabled: !!klub,
  });

  const userId = data?.userId ?? null;
  const role = data?.role ?? null;
  const profiles = data?.profiles ?? null;
  const catalog = data?.catalog ?? [];
  const myEnrollments = data?.myEnrollments ?? null;
  const isAdmin = role !== null && ADMIN_ROLES.includes(role);
  const error = fetchError instanceof Error ? fetchError.message : mutationError;

  const sportName = (code: string) => catalog.find((s) => s.code === code)?.name ?? code;

  const enrollmentByProfile = React.useMemo(() => {
    const map = new Map<string, PlayerSportEnrollment>();
    for (const e of myEnrollments ?? []) {
      map.set(e.klubSportProfileId, e);
    }
    return map;
  }, [myEnrollments]);

  async function handleRequest(profile: KlubSportProfile) {
    if (!klub) return;
    try {
      const e = await requestEnrollment(klub.id, profile.sportCode);
      queryClient.setQueryData(['modalidades-screen', klub.id], (old: typeof data) =>
        old ? { ...old, myEnrollments: [...old.myEnrollments, e] } : old,
      );
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : 'Erro ao solicitar inscrição');
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {isAdmin ? (
        <div className="mb-5 inline-flex rounded-md border border-border bg-card p-0.75">
          <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
            Todas modalidades
          </TabButton>
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
            Aprovar pendentes
          </TabButton>
        </div>
      ) : null}

      {error ? <Banner tone="error">{error}</Banner> : null}

      {tab === 'all' ? (
        <ProfilesGrid
          profiles={profiles}
          enrollmentByProfile={enrollmentByProfile}
          onRequest={handleRequest}
          sportName={sportName}
        />
      ) : (
        <PendingApprovalsTab
          klubId={klub?.id ?? null}
          profiles={profiles ?? []}
          sportName={sportName}
          onChanged={() => void refetch()}
          adminUserId={userId}
        />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 rounded-md px-3.5 text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

interface ProfilesGridProps {
  profiles: KlubSportProfile[] | null;
  enrollmentByProfile: Map<string, PlayerSportEnrollment>;
  onRequest: (p: KlubSportProfile) => void;
  sportName: (code: string) => string;
}

function ProfilesGrid({ profiles, enrollmentByProfile, onRequest, sportName }: ProfilesGridProps) {
  if (profiles === null) {
    return (
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-35 rounded-xl border border-border bg-card" />
          </li>
        ))}
      </ul>
    );
  }

  if (profiles.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhuma modalidade ativa"
        description="O Klub ainda não habilitou modalidades. Klub Admin pode adicionar nas configurações."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {profiles.map((p) => {
        const enrollment = enrollmentByProfile.get(p.id) ?? null;
        return (
          <li key={p.id}>
            <ProfileCard
              profile={p}
              displayName={p.name ?? sportName(p.sportCode)}
              enrollment={enrollment}
              onRequest={() => onRequest(p)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function ProfileCard({
  profile,
  displayName,
  enrollment,
  onRequest,
}: {
  profile: KlubSportProfile;
  displayName: string;
  enrollment: PlayerSportEnrollment | null;
  onRequest: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await Promise.resolve(onRequest());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <h3
        className="truncate font-display text-base font-bold leading-tight"
        style={{ letterSpacing: '-0.01em' }}
      >
        {displayName}
      </h3>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{profile.sportCode}</p>
      {profile.description ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{profile.description}</p>
      ) : null}

      <div className="mt-auto flex items-center justify-between pt-4">
        <EnrollmentBadge status={enrollment?.status ?? null} />
        {!enrollment ? (
          <button
            type="button"
            onClick={() => void handleClick()}
            disabled={submitting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Solicitando…
              </>
            ) : (
              'Solicitar inscrição'
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EnrollmentBadge({ status }: { status: EnrollmentStatus | null }) {
  if (status === null) {
    return <span className="text-xs text-muted-foreground">Não inscrito</span>;
  }
  const cfg: Record<EnrollmentStatus, { label: string; cls: string; icon: typeof Check }> = {
    pending: {
      label: 'Aguardando aprovação',
      cls: 'bg-[hsl(var(--brand-accent-500)/0.14)] text-[hsl(38_92%_28%)]',
      icon: Clock,
    },
    active: {
      label: 'Inscrito',
      cls: 'bg-primary/10 text-brand-primary-600',
      icon: Check,
    },
    suspended: {
      label: 'Suspenso',
      cls: 'bg-muted text-muted-foreground',
      icon: X,
    },
    cancelled: {
      label: 'Cancelado',
      cls: 'bg-muted text-muted-foreground',
      icon: X,
    },
  };
  const { label, cls, icon: Icon } = cfg[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-bold uppercase tracking-wider',
        cls,
      )}
    >
      <Icon className="size-3" strokeWidth={2.4} />
      {label}
    </span>
  );
}

interface PendingApprovalsTabProps {
  klubId: string | null;
  profiles: KlubSportProfile[];
  sportName: (code: string) => string;
  onChanged: () => void;
  adminUserId: string | null;
}

function PendingApprovalsTab({
  klubId,
  profiles,
  sportName,
  onChanged,
  adminUserId: _adminUserId,
}: PendingApprovalsTabProps) {
  const queryClient = useQueryClient();
  const pendingQueryKey = ['pending-enrollments', klubId, profiles.map((p) => p.id)];
  const [error, setError] = React.useState<string | null>(null);

  const { data: pending } = useQuery({
    queryKey: pendingQueryKey,
    queryFn: async () => {
      if (!klubId || profiles.length === 0) return [];
      const arrs = await Promise.all(
        profiles.map((p) =>
          listEnrollmentsByProfile(klubId, p.sportCode)
            .then((list) =>
              list
                .filter((e) => e.status === 'pending')
                .map((e) => ({ enrollment: e, profile: p })),
            )
            .catch((err: unknown) => {
              if (err instanceof ApiError && err.status === 403) return [];
              throw err;
            }),
        ),
      );
      return arrs.flat();
    },
    enabled: !!klubId,
  });

  async function handleApprove(id: string) {
    try {
      await approveEnrollment(id);
      queryClient.setQueryData<{ enrollment: PlayerSportEnrollment; profile: KlubSportProfile }[]>(
        pendingQueryKey,
        (prev) => prev?.filter((p) => p.enrollment.id !== id),
      );
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar');
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectEnrollment(id);
      queryClient.setQueryData<{ enrollment: PlayerSportEnrollment; profile: KlubSportProfile }[]>(
        pendingQueryKey,
        (prev) => prev?.filter((p) => p.enrollment.id !== id),
      );
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar');
    }
  }

  if (error) {
    return <Banner tone="error">{error}</Banner>;
  }

  if (pending === undefined) {
    return <p className="text-sm text-muted-foreground">Carregando pendentes…</p>;
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Nenhuma inscrição pendente"
        description="Tudo em dia."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {pending.map(({ enrollment, profile }) => (
        <li
          key={enrollment.id}
          className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <p className="text-sm font-semibold">{profile.name ?? sportName(profile.sportCode)}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              user {enrollment.userId.slice(0, 8)}… · pediu{' '}
              {new Date(enrollment.enrolledAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleReject(enrollment.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted"
            >
              <X className="size-3.5" /> Rejeitar
            </button>
            <button
              type="button"
              onClick={() => void handleApprove(enrollment.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Check className="size-3.5" /> Aprovar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
