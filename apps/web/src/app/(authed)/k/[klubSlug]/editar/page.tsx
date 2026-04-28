'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Power,
  Save,
} from 'lucide-react';
import type { Klub } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import {
  deactivateKlub as apiDeactivateKlub,
  getKlubById,
  updateKlub,
  type UpdateKlubInput,
} from '@/lib/api/klubs';
import { cn } from '@/lib/utils';

/**
 * Sprint Polish PR-F — KLUB_ADMIN edita campos básicos do Klub.
 * SUPER_ADMIN vê adicionalmente botão de desativar (soft delete).
 */
export default function EditarKlubPage() {
  const router = useRouter();
  const { klub: ctxKlub } = useActiveKlub();
  const [klub, setKlub] = React.useState<Klub | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form state
  const [v, setV] = React.useState<UpdateKlubInput>({});

  React.useEffect(() => {
    if (!ctxKlub) return;
    let cancelled = false;
    void Promise.all([getKlubById(ctxKlub.id), getMe()])
      .then(([k, me]) => {
        if (cancelled) return;
        setKlub(k);
        setIsSuperAdmin(me.roleAssignments.some((r) => r.role === 'SUPER_ADMIN'));
        setV({
          name: k.name,
          description: k.description ?? null,
          type: k.type,
          email: k.email,
          phone: k.phone,
          website: (k as unknown as { website?: string | null }).website ?? null,
          cep: k.cep,
          addressStreet: k.addressStreet,
          addressNumber: k.addressNumber,
          addressComplement: k.addressComplement,
          addressNeighborhood: k.addressNeighborhood,
          city: k.city,
          state: k.state,
          discoverable: k.discoverable,
          accessMode: k.accessMode,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar Klub.');
      });
    return () => {
      cancelled = true;
    };
  }, [ctxKlub]);

  function set<K extends keyof UpdateKlubInput>(key: K, value: UpdateKlubInput[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!klub || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateKlub(klub.id, v);
      setKlub(updated);
      setActionMessage('Klub atualizado.');
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao salvar.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!klub) return;
    const reason = window.prompt('Motivo da desativação (opcional)');
    if (reason === null) return;
    if (!window.confirm(`Desativar o Klub "${klub.name}"? Members perdem acesso até reativação.`)) {
      return;
    }
    setError(null);
    try {
      await apiDeactivateKlub(klub.id, reason || undefined);
      setActionMessage('Klub desativado. Redirecionando…');
      setTimeout(() => router.replace('/home'), 1500);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar.',
      );
    }
  }

  if (!ctxKlub) return null;
  if (!klub) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar pro Klub
        </Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Admin · {klub.name}
          </p>
          <h1
            className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Editar Klub
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Slug, documento legal e plano só são editáveis pela área de cadastros (SUPER_ADMIN).
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

        <Section title="Identidade">
          <Field label="Nome">
            <input
              value={v.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              maxLength={100}
              className={inputCls}
            />
          </Field>
          <Field label="Descrição">
            <textarea
              value={v.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              maxLength={2000}
              className={inputCls}
            />
          </Field>
          <Field label="Tipo">
            <select
              value={v.type ?? 'sports_club'}
              onChange={(e) => set('type', e.target.value as UpdateKlubInput['type'])}
              className={inputCls}
            >
              <option value="sports_club">Clube esportivo</option>
              <option value="condo">Condomínio</option>
              <option value="school">Escola/Academia</option>
              <option value="public_space">Espaço público</option>
              <option value="academy">Academia</option>
              <option value="individual">Pessoa física</option>
            </select>
          </Field>
        </Section>

        <Section title="Contato">
          <Field label="Email público">
            <input
              type="email"
              value={v.email ?? ''}
              onChange={(e) => set('email', e.target.value || null)}
              className={inputCls}
            />
          </Field>
          <Field label="Telefone">
            <input
              value={v.phone ?? ''}
              onChange={(e) => set('phone', e.target.value || null)}
              maxLength={30}
              className={inputCls}
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={v.website ?? ''}
              onChange={(e) => set('website', e.target.value || null)}
              placeholder="https://"
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Endereço">
          <div className="grid grid-cols-3 gap-2">
            <Field label="CEP">
              <input
                value={v.cep ?? ''}
                onChange={(e) => set('cep', e.target.value.replace(/\D/g, '').slice(0, 8) || null)}
                placeholder="00000000"
                className={inputCls}
              />
            </Field>
            <Field label="Cidade">
              <input
                value={v.city ?? ''}
                onChange={(e) => set('city', e.target.value || null)}
                className={inputCls}
              />
            </Field>
            <Field label="UF">
              <input
                value={v.state ?? ''}
                onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2) || null)}
                maxLength={2}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Bairro">
            <input
              value={v.addressNeighborhood ?? ''}
              onChange={(e) => set('addressNeighborhood', e.target.value || null)}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Field label="Logradouro">
                <input
                  value={v.addressStreet ?? ''}
                  onChange={(e) => set('addressStreet', e.target.value || null)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Número">
              <input
                value={v.addressNumber ?? ''}
                onChange={(e) => set('addressNumber', e.target.value || null)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Complemento">
            <input
              value={v.addressComplement ?? ''}
              onChange={(e) => set('addressComplement', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Visibilidade">
          <Toggle
            label="Aparecer em Buscar Klubs"
            help="Klubs públicos com toggle on aparecem em /buscar-klubs."
            value={v.discoverable ?? false}
            onChange={(c) => set('discoverable', c)}
          />
          <Field label="Modo de acesso">
            <select
              value={v.accessMode ?? 'public'}
              onChange={(e) => set('accessMode', e.target.value as 'public' | 'private')}
              className={inputCls}
            >
              <option value="public">Público — qualquer um entra direto</option>
              <option value="private">Privado — precisa aprovação</option>
            </select>
          </Field>
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Salvar alterações
          </button>
        </div>

        {isSuperAdmin ? (
          <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <h2 className="font-display text-[15px] font-bold text-destructive">Zona perigosa</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Desativar o Klub é soft delete — `deletedAt` populado, `status='suspended'`.
              Members perdem acesso. Reversível via SQL.
            </p>
            <button
              type="button"
              onClick={() => void handleDeactivate()}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive bg-destructive/10 px-3 text-[12.5px] font-semibold text-destructive hover:bg-destructive/20"
            >
              <Power className="size-3.5" />
              Desativar Klub
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

const inputCls =
  'w-full rounded-[10px] border border-input bg-background p-3 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-[14px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'flex w-full items-center justify-between rounded-[10px] border p-3 text-[13px] font-medium transition-colors',
          value
            ? 'border-primary bg-primary/10 text-[hsl(var(--brand-primary-600))]'
            : 'border-input bg-background hover:bg-muted',
        )}
      >
        <span>{label}</span>
        <span
          className={cn(
            'inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
            value ? 'border-primary bg-primary' : 'border-input bg-muted',
          )}
        >
          <span
            className={cn(
              'size-4 rounded-full bg-background transition-transform',
              value ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
      {help ? <p className="mt-1 text-[11px] text-muted-foreground">{help}</p> : null}
    </div>
  );
}
