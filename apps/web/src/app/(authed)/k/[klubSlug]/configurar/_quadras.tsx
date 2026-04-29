'use client';

/**
 * Sprint O batch O-7 — QuadrasTab extraída de _components.tsx.
 * Cobre: QuadrasTab, SpaceCard, CreateSpaceContent, EditSpaceContent,
 * DeleteConfirmModal, Modal, StatusBadge, sportLabel, surfaceLabel.
 */

import * as React from 'react';
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Klub, Space } from '@draftklub/shared-types';
import {
  createSpace,
  deleteSpace,
  listKlubSpaces,
  updateSpace,
  type CreateSpaceInput,
  type UpdateSpaceInput,
} from '@/lib/api/spaces';
import { SpaceForm } from '@/components/spaces/space-form';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { toErrorMessage } from './_form-helpers';

// ─── Quadras tab (porta /quadras) ───────────────────────────────────────

export function QuadrasTab({ klub }: { klub: Klub }) {
  const [spaces, setSpaces] = React.useState<Space[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [message, setMessage] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Space | null>(null);
  const [deleting, setDeleting] = React.useState<Space | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    listKlubSpaces(klub.id)
      .then((data) => {
        if (!cancelled) setSpaces(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toErrorMessage(err, 'Erro ao carregar quadras.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klub.id, reload]);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold">Quadras</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerencie quadras/espaços disponíveis pra reserva.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>

      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      {spaces === null ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : spaces.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma quadra cadastrada"
          description="Adicione a primeira quadra pra players começarem a reservar."
        />
      ) : (
        <ul className="space-y-3">
          {spaces.map((s) => (
            <li key={s.id}>
              <SpaceCard space={s} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <Modal title="Adicionar quadra" onClose={() => setCreateOpen(false)}>
          <CreateSpaceContent
            klubId={klub.id}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              setMessage('Quadra criada.');
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
              setMessage('Quadra atualizada.');
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
            setMessage('Quadra excluída.');
            setReload((n) => n + 1);
          }}
        />
      ) : null}
    </section>
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
            <h3 className="truncate font-display text-base font-bold">{space.name}</h3>
            <StatusBadge status={space.status} />
          </div>
          <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {sport ? <span>{sport}</span> : null}
            {surface ? <span>· {surface}</span> : null}
            <span>· {space.indoor ? 'Indoor' : 'Outdoor'}</span>
            {space.hasLighting ? <span>· iluminação</span> : null}
            <span>· até {space.maxPlayers} players</span>
          </p>
          {space.description ? (
            <p className="mt-2 text-xs text-muted-foreground">{space.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-semibold hover:bg-muted"
        >
          <Pencil className="size-3" />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
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
      setError(toErrorMessage(err, 'Erro ao criar.'));
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
      setError(toErrorMessage(err, 'Erro ao salvar.'));
      setSubmitting(false);
    }
  }

  return (
    <SpaceForm
      initial={{
        name: space.name,
        type: space.type,
        sportCode: (space.sportCode ?? undefined) as
          | 'tennis'
          | 'padel'
          | 'squash'
          | 'beach_tennis'
          | undefined,
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
      setError(toErrorMessage(err, 'Erro ao excluir.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <h2 className="font-display text-lg font-bold">Excluir {space.name}?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A quadra será removida da listagem. Reservas futuras precisam ser canceladas antes — caso
          contrário a exclusão é bloqueada.
        </p>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
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
      ? 'bg-success/12 text-success'
      : status === 'maintenance'
        ? 'bg-warning/15 text-warning-foreground'
        : 'bg-muted text-muted-foreground';
  const label = status === 'active' ? 'Ativa' : status === 'maintenance' ? 'Manutenção' : 'Inativa';
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
