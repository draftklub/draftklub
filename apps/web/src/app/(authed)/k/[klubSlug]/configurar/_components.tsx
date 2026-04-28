'use client';

/**
 * Sprint L PR-L3 — coleção de tab-components do /configurar.
 *
 * Migrado da page.tsx monolítica de 1714 linhas. Cada sub-rota
 * (identidade/localizacao/contato/visibilidade/modalidades/quadras/
 * equipe/legal/perigosa) importa o tab que precisa daqui. Refatoração
 * pra primitivos (Modal/Banner/etc) e tokens é PR-L4+.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type {
  Klub,
  KlubSportProfile,
  Role,
  RoleAssignmentListItem,
  Space,
  SportCatalog,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import {
  deactivateKlub as apiDeactivateKlub,
  updateKlub,
  type UpdateKlubInput,
} from '@/lib/api/klubs';
import { addSportToKlub, listKlubSports, listSports } from '@/lib/api/sports';
import {
  grantKlubRole,
  listKlubRoleAssignments,
  revokeKlubRole,
  transferKlubAdmin,
} from '@/lib/api/role-assignments';
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

interface FormTabProps {
  klub: Klub;
  onUpdated: (updated: Klub) => void;
}

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
    <section className="space-y-2.5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[14px] font-bold">
            Identidade legal{' '}
            <span className="ml-2 inline-flex h-5 items-center rounded-full bg-amber-500/20 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
              Platform-level
            </span>
          </h2>
          <p className="text-[12px] text-muted-foreground">
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
      <h2 className="font-display text-[15px] font-bold text-destructive">Zona perigosa</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        Desativar o Klub é soft delete — `deletedAt` populado, `status='suspended'`. Members perdem
        acesso. Reversível via SQL.
      </p>
      {message ? (
        <p className="mt-3 rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
          <CheckCircle2 className="mr-1 inline size-3.5" />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-[13px] text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleDeactivate()}
        disabled={submitting}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive bg-destructive/10 px-3 text-[12.5px] font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
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
  const [items, setItems] = React.useState<RoleAssignmentListItem[] | null>(null);
  const [sports, setSports] = React.useState<KlubSportProfile[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    void Promise.all([listKlubRoleAssignments(klub.id), listKlubSports(klub.id)])
      .then(([rows, sportsList]) => {
        if (cancelled) return;
        setItems(rows);
        setSports(sportsList);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toErrorMessage(err, 'Erro ao carregar equipe.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klub.id, reload]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-[14px] font-bold">Equipe</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Conceda roles operacionais (Assistant, Sport Commission, Sport Staff). Transfira
          KLUB_ADMIN pra outro membro abaixo se for o caso.
        </p>
      </header>

      {message ? (
        <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
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

      <EquipeGrantForm
        klubId={klub.id}
        sports={sports}
        onGranted={(msg) => {
          setMessage(msg);
          setReload((n) => n + 1);
        }}
        onError={setError}
      />

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Equipe atual
        </h3>
        {items === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
            Sem roles operacionais ainda — você ainda é o único admin desse Klub.
          </p>
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
                    setReload((n) => n + 1);
                  }}
                  onError={setError}
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
            setReload((n) => n + 1);
          }}
          onError={setError}
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
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleTransfer() {
    if (submitting || !email.trim()) return;
    const target = email.trim().toLowerCase();
    const confirmMsg =
      `Transferir KLUB_ADMIN de "${klubName}" para ${target}?\n\n` +
      `Você sai LIMPO desse Klub: zero role administrativa. Continuará membro/sócio se já era. ` +
      `Apenas o novo admin pode te readmitir como Assistant.`;
    if (!window.confirm(confirmMsg)) return;
    setSubmitting(true);
    try {
      await transferKlubAdmin(klubId, target);
      onTransferred(`Klub Admin transferido pra ${target}.`);
      // Caller pode ter perdido acesso de admin — após 1.5s redireciona pra
      // home, deixando UI mostrar a mensagem antes.
      setTimeout(() => router.replace(`/k/${klubSlug}/dashboard`), 1500);
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao transferir admin.'));
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 text-amber-700 dark:text-amber-400" />
        <h3 className="font-display text-[14px] font-bold">Transferir Klub Admin</h3>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Passa o controle deste Klub pra outro membro. Você <strong>sai limpo</strong> da
        administração — zero role. Membership/sócio permanece. Target precisa já ser membro ativo do
        Klub.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email-do-novo-admin@dominio.com"
          disabled={submitting}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => void handleTransfer()}
          disabled={submitting || !email.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500/10 px-4 text-[13px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Power className="size-3.5" />
          )}
          Transferir
        </button>
      </div>
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
        <h3 className="font-display text-[14px] font-bold">Adicionar membro</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
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
      {roleHint ? <p className="text-[11.5px] text-muted-foreground">{roleHint}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !email.trim()}
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
          <p className="truncate font-display text-[14px] font-bold">{item.userFullName}</p>
          <KlubRoleBadge role={item.role} />
          {sportName ? (
            <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {sportName}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.userEmail}</p>
      </div>
      {canRevoke ? (
        <button
          type="button"
          onClick={() => void handleRevoke()}
          disabled={submitting}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
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
    <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[hsl(var(--brand-primary-600))]">
      {map[role] ?? role}
    </span>
  );
}

// ─── Modalidades tab ────────────────────────────────────────────────────

export function ModalidadesTab({ klub }: { klub: Klub }) {
  const [sports, setSports] = React.useState<SportCatalog[] | null>(null);
  const [enabled, setEnabled] = React.useState<KlubSportProfile[]>([]);
  const [enabling, setEnabling] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([listSports(), listKlubSports(klub.id)])
      .then(([all, profiles]) => {
        if (cancelled) return;
        setSports(all);
        setEnabled(profiles);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toErrorMessage(err, 'Erro ao carregar modalidades.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klub.id]);

  async function handleEnable(code: string) {
    if (enabling) return;
    setEnabling(code);
    setError(null);
    try {
      const profile = await addSportToKlub(klub.id, code);
      setEnabled((prev) => [...prev, profile]);
      setMessage(`Modalidade ${profile.sportCode} habilitada.`);
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao habilitar modalidade.'));
    } finally {
      setEnabling(null);
    }
  }

  const enabledCodes = new Set(enabled.map((p) => p.sportCode));

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      <div>
        <h2 className="font-display text-[14px] font-bold">Modalidades</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Cada modalidade habilita catálogo próprio (ranking, torneios, regras de partida). Habilita
          só o que tu realmente atende.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
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

      {sports === null ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sports.map((s) => {
            const isEnabled = enabledCodes.has(s.code);
            const loading = enabling === s.code;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => (isEnabled ? null : void handleEnable(s.code))}
                disabled={isEnabled || loading}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors',
                  isEnabled
                    ? 'border-[hsl(142_71%_32%)] bg-[hsl(142_71%_32%/0.05)]'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[14px] font-bold">{s.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{s.code}</p>
                </div>
                {loading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : isEnabled ? (
                  <CheckCircle2 className="size-4 text-[hsl(142_71%_32%)]" />
                ) : (
                  <Plus className="size-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

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
          <h2 className="font-display text-[14px] font-bold">Quadras</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Gerencie quadras/espaços disponíveis pra reserva.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </div>

      {message ? (
        <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px] text-[hsl(142_71%_32%)]">
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

      {spaces === null ? (
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
        <p className="mt-1 text-[13px] text-muted-foreground">
          A quadra será removida da listagem. Reservas futuras precisam ser canceladas antes — caso
          contrário a exclusão é bloqueada.
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
      ? 'bg-[hsl(142_71%_32%/0.12)] text-[hsl(142_71%_32%)]'
      : status === 'maintenance'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-muted text-muted-foreground';
  const label = status === 'active' ? 'Ativa' : status === 'maintenance' ? 'Manutenção' : 'Inativa';
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

// ─── Form helpers ───────────────────────────────────────────────────────

type SaveStatusValue =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

function useTabSave(klubId: string, buildPayload: () => UpdateKlubInput) {
  const [status, setStatus] = React.useState<SaveStatusValue>({ kind: 'idle' });

  async function run(onUpdated: (k: Klub) => void) {
    if (status.kind === 'saving') return;
    setStatus({ kind: 'saving' });
    try {
      const payload = buildPayload();
      const updated = await updateKlub(klubId, payload);
      setStatus({ kind: 'ok', message: 'Salvo.' });
      onUpdated(updated);
    } catch (err: unknown) {
      setStatus({ kind: 'error', message: toErrorMessage(err, 'Erro ao salvar.') });
    }
  }

  return { status, run };
}

function Section({
  title,
  status,
  onSave,
  children,
}: {
  title: string;
  status: SaveStatusValue;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-card p-3.5">
      <h2 className="font-display text-[14px] font-bold">{title}</h2>
      {children}
      <SaveStatus status={status} />
      <div className="flex justify-end">
        <SaveButton submitting={status.kind === 'saving'} onClick={onSave} />
      </div>
    </section>
  );
}

function SaveStatus({ status }: { status: SaveStatusValue }) {
  if (status.kind === 'idle' || status.kind === 'saving') return null;
  if (status.kind === 'ok') {
    return (
      <p className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-2.5 text-[12px] text-[hsl(142_71%_32%)]">
        <CheckCircle2 className="mr-1 inline size-3.5" />
        {status.message}
      </p>
    );
  }
  return (
    <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[12.5px] text-destructive">
      <AlertCircle className="mr-1 inline size-3.5" />
      {status.message}
    </p>
  );
}

function SaveButton({ submitting, onClick }: { submitting: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
    >
      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
      Salvar
    </button>
  );
}

const inputCls =
  'w-full rounded-[10px] border border-input bg-background px-3 py-2.25 text-[13.5px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </label>
      {children}
      {help ? <p className="mt-1 text-[11px] text-muted-foreground">{help}</p> : null}
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

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
