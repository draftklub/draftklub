'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Space } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import {
  createSpace,
  deleteSpace,
  listKlubSpaces,
  updateSpace,
  type CreateSpaceInput,
  type UpdateSpaceInput,
} from '@/lib/api/spaces';
import { SpaceForm } from '@/components/spaces/space-form';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-D — KLUB_ADMIN gerencia Spaces (quadras) do Klub.
 * Lista, edita campos básicos, soft-deleta. Configurações avançadas
 * (hourBands, granularidade) ainda só via onboarding wizard.
 */
export default function QuadrasPage() {
  const { klub } = useActiveKlub();
  const [spaces, setSpaces] = React.useState<Space[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Space | null>(null);
  const [deleting, setDeleting] = React.useState<Space | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    listKlubSpaces(klub.id)
      .then((data) => {
        if (!cancelled) setSpaces(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar quadras.',
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
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pro Klub
        </Link>

        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
              Admin · {klub.name}
            </p>
            <h1
              className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Quadras
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Gerencie quadras/espaços disponíveis pra reserva.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Adicionar
          </button>
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
        ) : spaces === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <MapPin className="size-4" />
            </div>
            <p className="mt-3 font-display text-[14px] font-bold">Nenhuma quadra cadastrada</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Adicione a primeira quadra pra players começarem a reservar.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {spaces.map((s) => (
              <li key={s.id}>
                <SpaceCard
                  space={s}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setDeleting(s)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <Modal title="Adicionar quadra" onClose={() => setCreateOpen(false)}>
          <CreateSpaceContent
            klubId={klub.id}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              setActionMessage('Quadra criada.');
              setReload((n) => n + 1);
            }}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`Editar ${editing.name}`} onClose={() => setEditing(null)}>
          <EditSpaceContent
            klubId={klub.id}
            space={editing}
            onClose={() => setEditing(null)}
            onUpdated={() => {
              setEditing(null);
              setActionMessage('Quadra atualizada.');
              setReload((n) => n + 1);
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <DeleteConfirmModal
          klubId={klub.id}
          space={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setActionMessage('Quadra excluída.');
            setReload((n) => n + 1);
          }}
        />
      ) : null}
    </main>
  );
}

function SpaceCard({
  space,
  onEdit,
  onDelete,
}: {
  space: Space;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sport = space.sportCode ? sportLabel(space.sportCode) : null;
  const surface = space.surface ? surfaceLabel(space.surface) : null;
  const isInactive = space.status === 'inactive';

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', isInactive && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-[16px] font-bold">{space.name}</h3>
            <StatusBadge status={space.status} />
          </div>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
            {sport ? <span>{sport}</span> : null}
            {surface ? <span>· {surface}</span> : null}
            <span>· {space.indoor ? 'Indoor' : 'Outdoor'}</span>
            {space.hasLighting ? <span>· iluminação</span> : null}
            <span>· até {space.maxPlayers} players</span>
          </p>
          {space.description ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">{space.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[12px] font-semibold hover:bg-muted"
        >
          <Pencil className="size-3" />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3" />
          Excluir
        </button>
      </div>
    </div>
  );
}

function CreateSpaceContent({
  klubId,
  onClose,
  onCreated,
}: {
  klubId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(values: CreateSpaceInput) {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await createSpace(klubId, values);
      onCreated();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao criar.',
      );
      setSubmitting(false);
    }
  }

  return (
    <SpaceForm
      onSubmit={(v) => handleSubmit(v as CreateSpaceInput)}
      onCancel={onClose}
      submitLabel={submitting ? 'Criando…' : 'Criar quadra'}
      submitting={submitting}
      error={error}
    />
  );
}

function EditSpaceContent({
  klubId,
  space,
  onClose,
  onUpdated,
}: {
  klubId: string;
  space: Space;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(values: UpdateSpaceInput) {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateSpace(klubId, space.id, values);
      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao salvar.',
      );
      setSubmitting(false);
    }
  }

  return (
    <SpaceForm
      initial={{
        name: space.name,
        type: space.type,
        sportCode: (space.sportCode ?? undefined) as 'tennis' | 'padel' | 'squash' | 'beach_tennis' | undefined,
        surface: space.surface ?? undefined,
        indoor: space.indoor,
        hasLighting: space.hasLighting,
        maxPlayers: space.maxPlayers,
        description: space.description ?? undefined,
        allowedMatchTypes: space.allowedMatchTypes,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      submitLabel={submitting ? 'Salvando…' : 'Salvar'}
      submitting={submitting}
      error={error}
    />
  );
}

function DeleteConfirmModal({
  klubId,
  space,
  onClose,
  onDeleted,
}: {
  klubId: string;
  space: Space;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await deleteSpace(klubId, space.id);
      onDeleted();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao excluir.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <h2 className="font-display text-lg font-bold">Excluir {space.name}?</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          A quadra será removida da listagem. Reservas futuras precisam ser canceladas
          antes — caso contrário a exclusão é bloqueada.
        </p>
        {error ? (
          <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-[13px] font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Excluir quadra
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'bg-[hsl(142_71%_32%/0.12)] text-[hsl(142_71%_32%)]'
      : status === 'maintenance'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-muted text-muted-foreground';
  const label =
    status === 'active' ? 'Ativa' : status === 'maintenance' ? 'Manutenção' : 'Inativa';
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

function sportLabel(s: string): string {
  const map: Record<string, string> = {
    tennis: 'Tênis',
    padel: 'Padel',
    squash: 'Squash',
    beach_tennis: 'Beach tennis',
  };
  return map[s] ?? s;
}

function surfaceLabel(s: string): string {
  const map: Record<string, string> = {
    clay: 'Saibro',
    hard: 'Hard',
    grass: 'Grama',
    synthetic: 'Sintético',
    carpet: 'Carpete',
  };
  return map[s] ?? s;
}
