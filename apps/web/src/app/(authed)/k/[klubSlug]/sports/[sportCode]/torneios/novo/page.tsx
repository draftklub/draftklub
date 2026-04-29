'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type {
  RankingListItem,
  RankingPointsSchema,
  TournamentFormat,
  TournamentRegistrationApproval,
  TournamentResultReportingMode,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { listKlubRankings } from '@/lib/api/rankings';
import {
  createPointsSchema,
  createTournament,
  listPointsSchemas,
  type CreateTournamentCategoryInput,
} from '@/lib/api/tournaments';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
import { Banner } from '@/components/ui/banner';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const FORMAT_OPTIONS: { value: TournamentFormat; label: string; hint: string }[] = [
  { value: 'knockout', label: 'Eliminatória', hint: 'Mata-mata simples; quem perde sai.' },
  {
    value: 'round_robin',
    label: 'Todos contra todos',
    hint: 'Cada um joga contra todos os outros.',
  },
  {
    value: 'double_elimination',
    label: 'Eliminação dupla',
    hint: 'Repescagem: precisa perder 2 vezes pra sair.',
  },
  {
    value: 'groups_knockout',
    label: 'Grupos + eliminatória',
    hint: 'Fase de grupos depois mata-mata com classificados.',
  },
];

interface CategoryDraft {
  name: string;
  maxPlayers: string;
  minRatingExpected: string;
  maxRatingExpected: string;
  pointsSchemaId: string;
}

const blankCategory = (): CategoryDraft => ({
  name: '',
  maxPlayers: '',
  minRatingExpected: '',
  maxRatingExpected: '',
  pointsSchemaId: '',
});

export default function NovoTorneioPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const router = useRouter();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [authChecked, setAuthChecked] = React.useState(false);
  const [canCreate, setCanCreate] = React.useState(false);
  const [rankings, setRankings] = React.useState<RankingListItem[] | null>(null);
  const [pointsSchemas, setPointsSchemas] = React.useState<RankingPointsSchema[] | null>(null);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [format, setFormat] = React.useState<TournamentFormat>('knockout');
  const [hasPrequalifiers, setHasPrequalifiers] = React.useState(false);
  const [registrationApproval, setRegistrationApproval] =
    React.useState<TournamentRegistrationApproval>('auto');
  const [resultReportingMode, setResultReportingMode] =
    React.useState<TournamentResultReportingMode>('committee_only');
  const [rankingId, setRankingId] = React.useState('');
  const [registrationOpensAt, setRegistrationOpensAt] = React.useState('');
  const [registrationClosesAt, setRegistrationClosesAt] = React.useState('');
  const [drawDate, setDrawDate] = React.useState('');
  const [prequalifierStartDate, setPrequalifierStartDate] = React.useState('');
  const [prequalifierEndDate, setPrequalifierEndDate] = React.useState('');
  const [mainStartDate, setMainStartDate] = React.useState('');
  const [mainEndDate, setMainEndDate] = React.useState('');
  const [categories, setCategories] = React.useState<CategoryDraft[]>([blankCategory()]);

  // Modal: criar points schema inline
  const [psModalOpen, setPsModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    void Promise.all([
      getMe(),
      listKlubRankings(klub.id, sportCode),
      listPointsSchemas(klub.id, sportCode),
    ])
      .then(([me, rks, schemas]) => {
        if (cancelled) return;
        const platform = me.roleAssignments.some((r) => isPlatformLevel(r.role));
        const local = me.roleAssignments.some(
          (r) =>
            (r.role === 'KLUB_ADMIN' ||
              r.role === 'KLUB_ASSISTANT' ||
              r.role === 'SPORT_COMMISSION') &&
            r.scopeKlubId === klub.id,
        );
        setCanCreate(platform || local);
        setRankings(rks);
        setPointsSchemas(schemas);
        // Auto-pick primeiro ranking se só houver 1
        const first = rks[0];
        if (rks.length === 1 && first) setRankingId(first.id);
        setAuthChecked(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBootError(toErrorMessage(err, 'Erro ao carregar.'));
          setAuthChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode]);

  function updateCategory(idx: number, patch: Partial<CategoryDraft>) {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addCategory() {
    setCategories((prev) => [...prev, blankCategory()]);
  }

  function removeCategory(idx: number) {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePointsSchemaCreated(created: RankingPointsSchema) {
    setPointsSchemas((prev) => (prev ? [...prev, created] : [created]));
    // Auto-aplicar à última categoria sem schema selecionado
    setCategories((prev) => {
      const idx = prev.findIndex((c) => !c.pointsSchemaId);
      if (idx === -1) return prev;
      return prev.map((c, i) => (i === idx ? { ...c, pointsSchemaId: created.id } : c));
    });
    setPsModalOpen(false);
  }

  async function handleSubmit() {
    if (submitting || !klub) return;
    setSubmitError(null);

    const errors: string[] = [];
    if (name.trim().length < 2) errors.push('Nome precisa ter pelo menos 2 caracteres.');
    if (!rankingId) errors.push('Escolha um ranking.');
    if (!registrationOpensAt) errors.push('Data de abertura de inscrições obrigatória.');
    if (!registrationClosesAt) errors.push('Data de fechamento de inscrições obrigatória.');
    if (!drawDate) errors.push('Data do sorteio obrigatória.');
    if (!mainStartDate) errors.push('Início da fase principal obrigatório.');
    if (categories.length === 0) errors.push('Adicione pelo menos uma categoria.');
    categories.forEach((c, i) => {
      if (!c.name.trim()) errors.push(`Categoria ${i + 1}: nome obrigatório.`);
      if (!c.pointsSchemaId) errors.push(`Categoria ${i + 1}: escolha um schema de pontos.`);
    });
    if (hasPrequalifiers && (!prequalifierStartDate || !prequalifierEndDate)) {
      errors.push('Datas da pré-qualificatória obrigatórias quando habilitada.');
    }

    const firstError = errors[0];
    if (firstError) {
      setSubmitError(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rankingId,
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        hasPrequalifiers,
        registrationApproval,
        resultReportingMode,
        registrationOpensAt: toIso(registrationOpensAt),
        registrationClosesAt: toIso(registrationClosesAt),
        drawDate: toIso(drawDate),
        prequalifierStartDate: hasPrequalifiers ? toIso(prequalifierStartDate) : undefined,
        prequalifierEndDate: hasPrequalifiers ? toIso(prequalifierEndDate) : undefined,
        mainStartDate: toIso(mainStartDate),
        mainEndDate: mainEndDate ? toIso(mainEndDate) : undefined,
        categories: categories.map<CreateTournamentCategoryInput>((c, i) => ({
          name: c.name.trim(),
          order: i,
          maxPlayers: c.maxPlayers ? Number(c.maxPlayers) : undefined,
          minRatingExpected: c.minRatingExpected ? Number(c.minRatingExpected) : undefined,
          maxRatingExpected: c.maxRatingExpected ? Number(c.maxRatingExpected) : undefined,
          pointsSchemaId: c.pointsSchemaId,
        })),
      };
      const created = await createTournament(klub.id, sportCode, payload);
      router.replace(`/k/${klub.slug}/sports/${sportCode}/torneios/${created.id}`);
    } catch (err: unknown) {
      setSubmitError(toErrorMessage(err, 'Erro ao criar torneio.'));
      setSubmitting(false);
    }
  }

  if (!klub) return null;

  if (!authChecked) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!canCreate) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h1 className="font-display text-lg font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas KLUB_ADMIN, KLUB_ASSISTANT, SPORT_COMMISSION ou Platform-level pode criar
            torneios.
          </p>
        </div>
      </main>
    );
  }

  if (bootError) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-destructive">{bootError}</p>
      </main>
    );
  }

  if (rankings?.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <PageHeader
            back={{ href: `/k/${klub.slug}/sports/${sportCode}/torneios`, label: `Torneios · ${sportLabel}` }}
            eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
            title="Criar torneio"
          />
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-amber-700 dark:text-amber-400" />
            <h2 className="font-display text-base font-bold">Nenhum ranking ativo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Antes de criar torneio, é preciso ter pelo menos um ranking ativo dessa modalidade.
              Criação de ranking pela UI entra em PR-K3.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          back={{ href: `/k/${klub.slug}/sports/${sportCode}/torneios`, label: `Torneios · ${sportLabel}` }}
          eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
          title="Criar torneio"
        />

        {submitError ? (
          <Banner tone="error">{submitError}</Banner>
        ) : null}

        <Section title="Identidade">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className={inputCls}
              placeholder="Ex: Aberto de Verão 2026"
            />
          </Field>
          <Field label="Descrição (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Formato">
          <Field label="Formato do torneio">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
              className={inputCls}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {FORMAT_OPTIONS.find((o) => o.value === format)?.hint}
            </p>
          </Field>

          <Toggle
            label="Pré-qualificatória"
            help="Fase prévia pra triar candidatos antes da chave principal."
            value={hasPrequalifiers}
            onChange={setHasPrequalifiers}
          />

          <Field label="Aprovação de inscrição">
            <select
              value={registrationApproval}
              onChange={(e) =>
                setRegistrationApproval(e.target.value as TournamentRegistrationApproval)
              }
              className={inputCls}
            >
              <option value="auto">Automática (qualquer um se inscreve)</option>
              <option value="committee">Comissão aprova cada inscrição</option>
            </select>
          </Field>

          <Field label="Reportagem de resultado de match">
            <select
              value={resultReportingMode}
              onChange={(e) =>
                setResultReportingMode(e.target.value as TournamentResultReportingMode)
              }
              className={inputCls}
            >
              <option value="committee_only">Comissão reporta</option>
              <option value="player_with_confirm">Player reporta + outro confirma</option>
            </select>
          </Field>

          <Field label="Ranking">
            <select
              value={rankingId}
              onChange={(e) => setRankingId(e.target.value)}
              className={inputCls}
            >
              <option value="">— escolha —</option>
              {(rankings ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Pontos do torneio aplicam neste ranking.
            </p>
          </Field>
        </Section>

        <Section title="Datas">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Inscrições abrem">
              <input
                type="datetime-local"
                value={registrationOpensAt}
                onChange={(e) => setRegistrationOpensAt(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Inscrições fecham">
              <input
                type="datetime-local"
                value={registrationClosesAt}
                onChange={(e) => setRegistrationClosesAt(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Sorteio">
              <input
                type="datetime-local"
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Início fase principal">
              <input
                type="datetime-local"
                value={mainStartDate}
                onChange={(e) => setMainStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Fim fase principal (opcional)">
              <input
                type="datetime-local"
                value={mainEndDate}
                onChange={(e) => setMainEndDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {hasPrequalifiers ? (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:grid-cols-2">
              <Field label="Pré-qualificatória — início">
                <input
                  type="datetime-local"
                  value={prequalifierStartDate}
                  onChange={(e) => setPrequalifierStartDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Pré-qualificatória — fim">
                <input
                  type="datetime-local"
                  value={prequalifierEndDate}
                  onChange={(e) => setPrequalifierEndDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          ) : null}
        </Section>

        <Section title="Categorias" extra={<CategoriesCount n={categories.length} />}>
          <p className="text-xs text-muted-foreground">
            Cada categoria tem chave própria. Ex: Masculino A, Feminino A, Mista B.
          </p>
          <ul className="space-y-3">
            {categories.map((c, i) => (
              <li key={i}>
                <CategoryEditor
                  category={c}
                  index={i}
                  pointsSchemas={pointsSchemas ?? []}
                  onChange={(patch) => updateCategory(i, patch)}
                  onRemove={categories.length > 1 ? () => removeCategory(i) : null}
                  onCreatePointsSchema={() => setPsModalOpen(true)}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addCategory}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border bg-background px-3.5 text-xs font-medium hover:bg-muted"
          >
            <Plus className="size-3.5" />
            Adicionar categoria
          </button>
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Criar torneio
          </button>
        </div>
      </div>

      {psModalOpen ? (
        <CreatePointsSchemaModal
          klubId={klub.id}
          sportCode={sportCode}
          onClose={() => setPsModalOpen(false)}
          onCreated={handlePointsSchemaCreated}
        />
      ) : null}
    </main>
  );
}

// ─── Helpers UI ────────────────────────────────────────────────────────

function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold">{title}</h2>
        {extra}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function CategoriesCount({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {n} categoria{n === 1 ? '' : 's'}
    </span>
  );
}

function CategoryEditor({
  category,
  index,
  pointsSchemas,
  onChange,
  onRemove,
  onCreatePointsSchema,
}: {
  category: CategoryDraft;
  index: number;
  pointsSchemas: RankingPointsSchema[];
  onChange: (patch: Partial<CategoryDraft>) => void;
  onRemove: (() => void) | null;
  onCreatePointsSchema: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Categoria {index + 1}
        </p>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover categoria"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3">
          <Field label="Nome">
            <input
              value={category.name}
              onChange={(e) => onChange({ name: e.target.value })}
              maxLength={20}
              placeholder="Masculino A"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Máx players">
          <input
            type="number"
            value={category.maxPlayers}
            onChange={(e) => onChange({ maxPlayers: e.target.value })}
            placeholder="32"
            min={2}
            className={inputCls}
          />
        </Field>
        <Field label="Rating mín">
          <input
            type="number"
            value={category.minRatingExpected}
            onChange={(e) => onChange({ minRatingExpected: e.target.value })}
            placeholder="800"
            className={inputCls}
          />
        </Field>
        <Field label="Rating máx">
          <input
            type="number"
            value={category.maxRatingExpected}
            onChange={(e) => onChange({ maxRatingExpected: e.target.value })}
            placeholder="1400"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Schema de pontos">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={category.pointsSchemaId}
            onChange={(e) => onChange({ pointsSchemaId: e.target.value })}
            className={cn(inputCls, 'flex-1')}
          >
            <option value="">— escolha ou crie —</option>
            {pointsSchemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreatePointsSchema}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
          >
            <Plus className="size-3.5" />
            Novo
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ex: champion=100, runnerUp=50, semi=25 — define quanto cada posição pontua no ranking.
        </p>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
          'flex w-full items-center justify-between rounded-md border p-3 text-sm font-medium transition-colors',
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
      {help ? <p className="mt-1 text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2.25 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

// ─── Modal: criar points schema ────────────────────────────────────────

interface PointDraft {
  key: string;
  value: string;
}

const DEFAULT_POINT_TEMPLATE: PointDraft[] = [
  { key: 'champion', value: '100' },
  { key: 'runnerUp', value: '60' },
  { key: 'semi', value: '30' },
  { key: 'quarter', value: '15' },
];

function CreatePointsSchemaModal({
  klubId,
  sportCode,
  onClose,
  onCreated,
}: {
  klubId: string;
  sportCode: string;
  onClose: () => void;
  onCreated: (created: RankingPointsSchema) => void;
}) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [points, setPoints] = React.useState<PointDraft[]>(DEFAULT_POINT_TEMPLATE);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function updatePoint(idx: number, patch: Partial<PointDraft>) {
    setPoints((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function addPoint() {
    setPoints((prev) => [...prev, { key: '', value: '0' }]);
  }
  function removePoint(idx: number) {
    setPoints((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (name.trim().length < 2) {
      setError('Nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    const map: Record<string, number> = {};
    for (const p of points) {
      const k = p.key.trim();
      if (!k) continue;
      const v = Number(p.value);
      if (!Number.isFinite(v) || v < 0) {
        setError(`Valor inválido pra ${k}.`);
        return;
      }
      map[k] = v;
    }
    if (Object.keys(map).length === 0) {
      setError('Adicione pelo menos uma chave de pontuação.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPointsSchema(klubId, sportCode, {
        name: name.trim(),
        description: description.trim() || undefined,
        points: map,
      });
      onCreated(created);
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao criar schema.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Novo schema de pontos"
      open={true}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Criar schema
          </button>
        </>
      }
    >
      {error ? (
        <Banner tone="error">{error}</Banner>
      ) : null}

      <Field label="Nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Default Tênis"
          maxLength={100}
          className={inputCls}
        />
      </Field>

      <Field label="Descrição (opcional)">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className={inputCls}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Pontos por posição
        </p>
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={p.key}
                onChange={(e) => updatePoint(i, { key: e.target.value })}
                placeholder="champion"
                className={cn(inputCls, 'flex-1')}
              />
              <input
                type="number"
                value={p.value}
                onChange={(e) => updatePoint(i, { value: e.target.value })}
                placeholder="100"
                min={0}
                className={cn(inputCls, 'w-24')}
              />
              <button
                type="button"
                onClick={() => removePoint(i)}
                aria-label="Remover"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addPoint}
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
        >
          <Plus className="size-3" />
          Adicionar
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          Chaves comuns: champion, runnerUp, semi, quarter, round_of_16, round_of_32.
        </p>
      </div>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function toIso(localDateTime: string): string {
  // <input type="datetime-local"> retorna "YYYY-MM-DDTHH:mm" em local time
  // sem TZ. new Date interpreta como local, .toISOString() converte pra UTC.
  return new Date(localDateTime).toISOString();
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
