'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { AdminPendingKlubDetail } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { approveKlub, getPendingKlub, rejectKlub, updatePendingKlub } from '@/lib/api/admin-klubs';
import { Modal } from '@/components/ui/modal';
import { hintDocument } from '@/lib/format-document';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';

export default function CadastroDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = React.useState<AdminPendingKlubDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Edit state
  const [editingSlug, setEditingSlug] = React.useState(false);
  const [slugDraft, setSlugDraft] = React.useState('');
  const [slugSaving, setSlugSaving] = React.useState(false);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejectSaving, setRejectSaving] = React.useState(false);

  const [approving, setApproving] = React.useState(false);

  const [rawOpen, setRawOpen] = React.useState(false);

  const reload = React.useCallback(() => {
    if (!id) return;
    setError(null);
    void getPendingKlub(id)
      .then((d) => setData(d))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar.');
      });
  }, [id]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  async function handleSaveSlug() {
    if (!id || !data) return;
    setSlugSaving(true);
    setActionError(null);
    try {
      await updatePendingKlub(id, { slug: slugDraft.trim() });
      setEditingSlug(false);
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao salvar slug',
      );
    } finally {
      setSlugSaving(false);
    }
  }

  async function handleApprove() {
    if (!id || !data || approving) return;
    setApproving(true);
    setActionError(null);
    try {
      await approveKlub(id);
      setActionSuccess('Cadastro aprovado.');
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao aprovar',
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!id || rejectSaving) return;
    setRejectSaving(true);
    setActionError(null);
    try {
      await rejectKlub(id, rejectReason.trim());
      setRejectModalOpen(false);
      setRejectReason('');
      setActionSuccess('Cadastro rejeitado.');
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao rejeitar',
      );
    } finally {
      setRejectSaving(false);
    }
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-10">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto size-6 text-destructive" />
          <p className="mt-2 text-sm font-semibold">Erro ao carregar</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/aprovacoes')}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const isPending = data.reviewStatus === 'pending';
  const slugConflict = !!data.slugConflictKlubName;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          back={{ href: '/admin/aprovacoes', label: 'Voltar pra lista' }}
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              {data.name}
              <ReviewBadge status={data.reviewStatus} />
            </span>
          }
          description={data.legalName ?? undefined}
        />

        {actionSuccess ? (
          <Banner tone="success">{actionSuccess}</Banner>
        ) : null}

        {actionError ? (
          <Banner tone="error">{actionError}</Banner>
        ) : null}

        {/* Identidade */}
        <Section title="Identidade">
          <Row label="Tipo">
            <span className="inline-flex items-center gap-1.5">
              {data.entityType === 'pj' ? (
                <Building2 className="size-3.5" />
              ) : (
                <UserIcon className="size-3.5" />
              )}
              {data.entityType === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
            </span>
          </Row>
          <Row label="Documento">
            <span className="font-mono">
              {data.entityType === 'pj'
                ? hintDocument(data.documentHint ?? '', 'cnpj')
                : hintDocument(data.createdBy?.documentNumber ?? '', 'cpf')}
            </span>
          </Row>
          {data.cnpjStatus ? (
            <Row label="Situação Receita">
              <span className="font-semibold capitalize">{data.cnpjStatus}</span>
              {data.cnpjStatusCheckedAt ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  consultado em {new Date(data.cnpjStatusCheckedAt).toLocaleDateString('pt-BR')}
                </span>
              ) : null}
            </Row>
          ) : null}
        </Section>

        {/* Criador */}
        {data.createdBy ? (
          <Section title="Solicitante">
            <Row label="Nome">{data.createdBy.fullName}</Row>
            <Row label="Email">
              <a href={`mailto:${data.createdBy.email}`} className="underline">
                {data.createdBy.email}
              </a>
            </Row>
            {data.createdBy.phone ? <Row label="Telefone">{data.createdBy.phone}</Row> : null}
            {data.createdBy.documentNumber ? (
              <Row label="CPF">
                <span className="font-mono">
                  {hintDocument(data.createdBy.documentNumber, 'cpf')}
                </span>
              </Row>
            ) : null}
          </Section>
        ) : null}

        {/* Endereço */}
        <Section title="Endereço">
          <Row label="Rua">
            {data.addressStreet ?? '—'}
            {data.addressNumber ? `, ${data.addressNumber}` : ''}
            {data.addressComplement ? ` — ${data.addressComplement}` : ''}
          </Row>
          <Row label="Bairro">{data.addressNeighborhood ?? '—'}</Row>
          <Row label="Cidade/UF">
            {data.city ?? '—'}
            {data.state ? `/${data.state}` : ''}
          </Row>
          {data.cep ? <Row label="CEP">{data.cep}</Row> : null}
          {data.addressSource === 'cnpj_lookup' ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-preenchido pela Receita Federal.
            </p>
          ) : null}
        </Section>

        {/* Modalidades + visibility */}
        <Section title="Configuração">
          <Row label="Modalidades">{data.sports.join(', ') || '—'}</Row>
          <Row label="Visibilidade">
            {data.discoverable ? 'Visível na busca' : 'Oculto na busca'}
          </Row>
          <Row label="Modo de acesso">{data.accessMode === 'public' ? 'Aberto' : 'Aprovação'}</Row>
        </Section>

        {/* Slug + conflict */}
        <Section title="URL pública">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-sm">
              draftklub.com/k/<strong>{data.slug}</strong>
            </span>
            {isPending ? (
              !editingSlug ? (
                <button
                  type="button"
                  onClick={() => {
                    setSlugDraft(data.slug);
                    setEditingSlug(true);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted"
                >
                  <Pencil className="size-3" />
                  Editar
                </button>
              ) : null
            ) : null}
          </div>

          {editingSlug ? (
            <div className="mt-3 space-y-2">
              <input
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
                className="h-10 w-full rounded-md border border-input bg-background px-3.5 font-mono text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveSlug()}
                  disabled={slugSaving || slugDraft.trim() === data.slug}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {slugSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlug(false)}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {slugConflict && isPending ? (
            <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="mr-1 inline size-3.5" />
              Slug em uso por <strong>{data.slugConflictKlubName}</strong>. Edite antes de aprovar.
            </div>
          ) : null}
        </Section>

        {/* CNPJ raw collapsible */}
        {data.cnpjLookupData ? (
          <Section title="Dados completos da Receita">
            <button
              type="button"
              onClick={() => setRawOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {rawOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {rawOpen ? 'Esconder' : 'Ver payload BrasilAPI'}
            </button>
            {rawOpen ? (
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {JSON.stringify(data.cnpjLookupData, null, 2)}
              </pre>
            ) : null}
          </Section>
        ) : null}

        {/* Decisão histórica */}
        {!isPending ? (
          <Section title="Decisão">
            <Row label="Status">
              <span className="capitalize">{data.reviewStatus}</span>
            </Row>
            {data.reviewDecisionAt ? (
              <Row label="Em">{new Date(data.reviewDecisionAt).toLocaleString('pt-BR')}</Row>
            ) : null}
            {data.reviewRejectionReason ? (
              <Row label="Motivo">{data.reviewRejectionReason}</Row>
            ) : null}
          </Section>
        ) : null}

        {/* Action buttons */}
        {isPending ? (
          <div className="sticky bottom-4 flex flex-wrap gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => void handleApprove()}
              disabled={slugConflict || approving}
              title={slugConflict ? 'Resolva o conflito de slug primeiro' : undefined}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(142_71%_28%)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Aprovar cadastro
            </button>
            <button
              type="button"
              onClick={() => setRejectModalOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <X className="size-3.5" />
              Rejeitar
            </button>
          </div>
        ) : null}
      </div>

      <Modal
        title="Rejeitar cadastro"
        description="Escreve um motivo claro — o usuário vai receber por email."
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        size="sm"
        dismissOnBackdropClick={!rejectSaving}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejectSaving}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={rejectReason.trim().length < 10 || rejectSaving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {rejectSaving ? (
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
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Ex: CNPJ não encontrado na Receita Federal. Conferir os dígitos."
          rows={4}
          maxLength={500}
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {rejectReason.trim().length}/500 (mín 10)
        </p>
      </Modal>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 py-1 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function ReviewBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const tone =
    status === 'pending'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      : status === 'approved'
        ? 'bg-success/12 text-success'
        : 'bg-destructive/10 text-destructive';
  const label =
    status === 'pending' ? 'Pendente' : status === 'approved' ? 'Aprovado' : 'Rejeitado';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      {label}
    </span>
  );
}
