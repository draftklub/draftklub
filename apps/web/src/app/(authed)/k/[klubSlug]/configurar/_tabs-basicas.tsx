'use client';

/**
 * Sprint O batch O-7 — tabs básicas de /configurar extraídas de _components.tsx.
 * Cobre: IdentidadeTab, LocalizacaoTab, ContatoTab, VisibilidadeTab,
 * LegalTab, PerigosaTab.
 */

import * as React from 'react';
import { Loader2, Power } from 'lucide-react';
import type { Klub } from '@draftklub/shared-types';
import { deactivateKlub as apiDeactivateKlub, type UpdateKlubInput } from '@/lib/api/klubs';
import { Banner } from '@/components/ui/banner';
import {
  Field,
  type FormTabProps,
  SaveButton,
  SaveStatus,
  Section,
  Toggle,
  inputCls,
  toErrorMessage,
  useTabSave,
} from './_form-helpers';

export function IdentidadeTab({ klub, onUpdated }: FormTabProps) {
  const [v, setV] = React.useState({
    name: klub.name,
    commonName: klub.commonName ?? '',
    abbreviation: klub.abbreviation ?? '',
    description: klub.description ?? '',
    type: klub.type,
  });

  const save = useTabSave(klub.id, () => ({
    name: v.name,
    commonName: v.commonName.trim() || null,
    abbreviation: v.abbreviation.trim() || null,
    description: v.description.trim() || null,
    type: v.type,
  }));

  return (
    <Section title="Identidade" status={save.status} onSave={() => void save.run(onUpdated)}>
      <Field label="Nome">
        <input
          value={v.name}
          onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))}
          maxLength={100}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Field label="Abreviação" help="Ex: PAC.">
            <input
              value={v.abbreviation}
              onChange={(e) => setV((p) => ({ ...p, abbreviation: e.target.value }))}
              maxLength={10}
              placeholder="PAC"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Nome usual" help="Como o pessoal chama no dia a dia.">
            <input
              value={v.commonName}
              onChange={(e) => setV((p) => ({ ...p, commonName: e.target.value }))}
              maxLength={100}
              placeholder="Paissandú"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <Field label="Descrição">
        <textarea
          value={v.description}
          onChange={(e) => setV((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          maxLength={2000}
          className={inputCls}
        />
      </Field>
      <Field label="Tipo">
        <select
          value={v.type}
          onChange={(e) => setV((p) => ({ ...p, type: e.target.value as Klub['type'] }))}
          className={inputCls}
        >
          <option value="sports_club">Clube esportivo / social</option>
          <option value="arena">Arena / Centro esportivo</option>
          <option value="academy">Academia / Escola de esporte</option>
          <option value="condo">Condomínio</option>
          <option value="hotel_resort">Hotel / Resort</option>
          <option value="university">Universidade / Faculdade</option>
          <option value="school">Escola / Colégio</option>
          <option value="public_space">Espaço público</option>
          <option value="individual">Pessoa física</option>
        </select>
      </Field>
    </Section>
  );
}

export function LocalizacaoTab({ klub, onUpdated }: FormTabProps) {
  const [v, setV] = React.useState({
    cep: klub.cep ?? '',
    addressStreet: klub.addressStreet ?? '',
    addressNumber: klub.addressNumber ?? '',
    addressComplement: klub.addressComplement ?? '',
    addressNeighborhood: klub.addressNeighborhood ?? '',
    city: klub.city ?? '',
    state: klub.state ?? '',
  });

  const save = useTabSave(klub.id, () => ({
    cep: v.cep.trim() || null,
    addressStreet: v.addressStreet.trim() || null,
    addressNumber: v.addressNumber.trim() || null,
    addressComplement: v.addressComplement.trim() || null,
    addressNeighborhood: v.addressNeighborhood.trim() || null,
    city: v.city.trim() || null,
    state: v.state.trim().toUpperCase().slice(0, 2) || null,
  }));

  return (
    <Section title="Endereço" status={save.status} onSave={() => void save.run(onUpdated)}>
      <div className="grid grid-cols-3 gap-2">
        <Field label="CEP">
          <input
            value={v.cep}
            onChange={(e) =>
              setV((p) => ({ ...p, cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))
            }
            placeholder="00000000"
            className={inputCls}
          />
        </Field>
        <Field label="Cidade">
          <input
            value={v.city}
            onChange={(e) => setV((p) => ({ ...p, city: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="UF">
          <input
            value={v.state}
            onChange={(e) =>
              setV((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))
            }
            maxLength={2}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Bairro">
        <input
          value={v.addressNeighborhood}
          onChange={(e) => setV((p) => ({ ...p, addressNeighborhood: e.target.value }))}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Field label="Logradouro">
            <input
              value={v.addressStreet}
              onChange={(e) => setV((p) => ({ ...p, addressStreet: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Número">
          <input
            value={v.addressNumber}
            onChange={(e) => setV((p) => ({ ...p, addressNumber: e.target.value }))}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="Complemento">
        <input
          value={v.addressComplement}
          onChange={(e) => setV((p) => ({ ...p, addressComplement: e.target.value }))}
          className={inputCls}
        />
      </Field>
    </Section>
  );
}

export function ContatoTab({ klub, onUpdated }: FormTabProps) {
  const [v, setV] = React.useState({
    email: klub.email ?? '',
    phone: klub.phone ?? '',
    website: klub.website ?? '',
  });

  const save = useTabSave(klub.id, () => ({
    email: v.email.trim() || null,
    phone: v.phone.trim() || null,
    website: v.website.trim() || null,
  }));

  return (
    <Section title="Contato" status={save.status} onSave={() => void save.run(onUpdated)}>
      <Field label="Email público">
        <input
          type="email"
          value={v.email}
          onChange={(e) => setV((p) => ({ ...p, email: e.target.value }))}
          className={inputCls}
        />
      </Field>
      <Field label="Telefone">
        <input
          value={v.phone}
          onChange={(e) => setV((p) => ({ ...p, phone: e.target.value }))}
          maxLength={30}
          className={inputCls}
        />
      </Field>
      <Field label="Website">
        <input
          type="url"
          value={v.website}
          onChange={(e) => setV((p) => ({ ...p, website: e.target.value }))}
          placeholder="https://"
          className={inputCls}
        />
      </Field>
    </Section>
  );
}

export function VisibilidadeTab({ klub, onUpdated }: FormTabProps) {
  const [discoverable, setDiscoverable] = React.useState(klub.discoverable);
  const [accessMode, setAccessMode] = React.useState<'public' | 'private'>(klub.accessMode);

  const save = useTabSave(klub.id, () => ({ discoverable, accessMode }));

  return (
    <Section title="Visibilidade" status={save.status} onSave={() => void save.run(onUpdated)}>
      <Toggle
        label="Aparecer em Buscar Klubs"
        help="Klubs públicos com toggle on aparecem em /buscar-klubs."
        value={discoverable}
        onChange={setDiscoverable}
      />
      <Field label="Modo de acesso">
        <select
          value={accessMode}
          onChange={(e) => setAccessMode(e.target.value as 'public' | 'private')}
          className={inputCls}
        >
          <option value="public">Público — qualquer um entra direto</option>
          <option value="private">Privado — precisa aprovação</option>
        </select>
      </Field>
    </Section>
  );
}

export function LegalTab({ klub, onUpdated }: FormTabProps) {
  const [v, setV] = React.useState({ slug: klub.slug, document: '' });

  const save = useTabSave(klub.id, () => {
    const payload: UpdateKlubInput = {};
    if (v.slug && v.slug !== klub.slug) payload.slug = v.slug;
    if (v.document) payload.document = v.document;
    return payload;
  });

  return (
    <section className="space-y-2.5 rounded-xl border border-warning/40 bg-warning/5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold">
            Identidade legal{' '}
            <span className="ml-2 inline-flex h-5 items-center rounded-full bg-warning/20 px-2 text-xs font-bold uppercase tracking-[0.06em] text-warning-foreground">
              Platform-level
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Mudanças aqui têm impacto operacional alto. Slug rompe URLs/bookmarks. CNPJ não revalida
            KYC automaticamente.
          </p>
        </div>
      </div>
      <SaveStatus status={save.status} />
      <Field label="Slug" help="Aparece nas URLs (/k/seu-slug/...). Lowercase, dígitos e hífen.">
        <input
          value={v.slug}
          onChange={(e) =>
            setV((p) => ({
              ...p,
              slug: e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
                .slice(0, 80),
            }))
          }
          placeholder={klub.slug}
          className={inputCls}
        />
      </Field>
      <Field
        label="CNPJ"
        help={`CNPJ atual: ${klub.documentHint ?? '(não cadastrado)'}. Deixar vazio mantém o atual.`}
      >
        <input
          value={v.document}
          onChange={(e) =>
            setV((p) => ({ ...p, document: e.target.value.replace(/\D/g, '').slice(0, 14) }))
          }
          placeholder="00000000000000 (só dígitos)"
          inputMode="numeric"
          className={inputCls}
        />
      </Field>
      <div className="flex justify-end">
        <SaveButton
          submitting={save.status.kind === 'saving'}
          onClick={() => void save.run(onUpdated)}
        />
      </div>
    </section>
  );
}

export function PerigosaTab({ klub, onDeactivated }: { klub: Klub; onDeactivated: () => void }) {
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleDeactivate() {
    const reason = window.prompt('Motivo da desativação (opcional)');
    if (reason === null) return;
    if (!window.confirm(`Desativar o Klub "${klub.name}"? Members perdem acesso até reativação.`)) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiDeactivateKlub(klub.id, reason || undefined);
      setMessage('Klub desativado. Redirecionando…');
      setTimeout(onDeactivated, 1500);
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao desativar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h2 className="font-display text-sm font-bold text-destructive">Zona perigosa</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Desativar o Klub é soft delete — `deletedAt` populado, `status='suspended'`. Members perdem
        acesso. Reversível via SQL.
      </p>
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <button
        type="button"
        onClick={() => void handleDeactivate()}
        disabled={submitting}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Power className="size-3.5" />
        )}
        Desativar Klub
      </button>
    </div>
  );
}
