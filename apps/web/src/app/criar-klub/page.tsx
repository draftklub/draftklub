'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import type {
  Klub,
  KlubType,
  SportCatalog,
} from '@draftklub/shared-types';
import { AuthGuard } from '@/components/auth-guard';
import { ApiError } from '@/lib/api/client';
import { createKlub, getKlubBySlug } from '@/lib/api/klubs';
import { listSports } from '@/lib/api/sports';
import { addSportToKlub } from '@/lib/api/sports';
import { rememberLastKlubSlug } from '@/lib/last-klub-cookie';
import { cn } from '@/lib/utils';

const KLUB_TYPES: { value: KlubType; label: string; hint: string }[] = [
  { value: 'sports_club', label: 'Clube esportivo', hint: 'tradicional, com sócios' },
  { value: 'condo', label: 'Condomínio', hint: 'quadras pra moradores' },
  { value: 'school', label: 'Escola', hint: 'aulas e turmas' },
  { value: 'public_space', label: 'Espaço público', hint: 'praça, parque' },
  { value: 'academy', label: 'Academia', hint: 'centro de treinamento' },
  { value: 'individual', label: 'Individual', hint: 'pequeno operador' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CriarKlubPage() {
  return (
    <AuthGuard>
      <CriarKlubFlow />
    </AuthGuard>
  );
}

type Step = 1 | 2 | 3;

function CriarKlubFlow() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);

  // Step 1
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [type, setType] = React.useState<KlubType>('sports_club');
  const [step1Error, setStep1Error] = React.useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = React.useState(false);

  // Step 2
  const [sports, setSports] = React.useState<SportCatalog[] | null>(null);
  const [sportError, setSportError] = React.useState<string | null>(null);
  const [selectedSports, setSelectedSports] = React.useState<Set<string>>(new Set());

  // Step 3
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Auto-slug enquanto user nao editou manualmente.
  React.useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  // Carrega catalogo de modalidades quando entra no step 2.
  React.useEffect(() => {
    if (step !== 2 || sports !== null) return;
    let cancelled = false;
    listSports()
      .then((data) => {
        if (!cancelled) setSports(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSportError(err instanceof Error ? err.message : 'Erro ao carregar modalidades');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, sports]);

  async function goToStep2() {
    setStep1Error(null);
    if (name.trim().length < 2) {
      setStep1Error('Nome muito curto.');
      return;
    }
    if (!slug || slug.length < 2) {
      setStep1Error('Slug obrigatório (use letras minúsculas, números e hífen).');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setStep1Error('Slug inválido. Use kebab-case: letras minúsculas, números e hífens.');
      return;
    }

    setCheckingSlug(true);
    try {
      // Backend retorna 404 se slug não existe — eh o que queremos.
      await getKlubBySlug(slug);
      setStep1Error(`Slug "${slug}" já está em uso. Escolha outro.`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setStep(2);
      } else {
        setStep1Error(err instanceof Error ? err.message : 'Erro ao validar slug');
      }
    } finally {
      setCheckingSlug(false);
    }
  }

  function toggleSport(code: string) {
    setSelectedSports((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created: Klub = await createKlub({
        name,
        slug,
        type,
        sportCodes: Array.from(selectedSports),
      });

      // Backend já cria sport profiles via sportCodes; mas se o array
      // tiver sido ignorado (versão velha do api), reforçamos via
      // POST /klubs/:id/sports/:code idempotente.
      // (O backend atual aceita sportCodes em CreateKlubDto então isso
      // geralmente é no-op — mantém defensivo.)
      for (const code of selectedSports) {
        try {
          await addSportToKlub(created.id, code);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            // já existe — OK.
            continue;
          }
          throw err;
        }
      }

      rememberLastKlubSlug(created.slug);
      router.replace(`/k/${created.slug}/dashboard`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao criar Klub');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/post-login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <StepIndicator current={step} />
        </div>

        <h1
          className="font-display text-[28px] font-bold md:text-[32px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Criar Klub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Em 3 passos: dados básicos → modalidades → confirmar.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
          {step === 1 ? (
            <Step1
              name={name}
              setName={setName}
              slug={slug}
              setSlug={(s) => {
                setSlugTouched(true);
                setSlug(s);
              }}
              type={type}
              setType={setType}
              error={step1Error}
              checking={checkingSlug}
              onNext={() => void goToStep2()}
            />
          ) : null}

          {step === 2 ? (
            <Step2
              sports={sports}
              error={sportError}
              selected={selectedSports}
              onToggle={toggleSport}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          ) : null}

          {step === 3 ? (
            <Step3
              name={name}
              slug={slug}
              type={type}
              selectedSports={selectedSports}
              sports={sports ?? []}
              submitting={submitting}
              error={submitError}
              onBack={() => {
                setSubmitError(null);
                setStep(2);
              }}
              onSubmit={() => void submit()}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
            n === current
              ? 'bg-primary text-primary-foreground'
              : n < current
                ? 'bg-primary/20 text-[hsl(var(--brand-primary-600))]'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {n < current ? <Check className="size-3" /> : n}
        </li>
      ))}
    </ol>
  );
}

interface Step1Props {
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  type: KlubType;
  setType: (v: KlubType) => void;
  error: string | null;
  checking: boolean;
  onNext: () => void;
}

function Step1({ name, setName, slug, setSlug, type, setType, error, checking, onNext }: Step1Props) {
  return (
    <div className="flex flex-col gap-5">
      <h2
        className="font-display text-[18px] font-bold"
        style={{ letterSpacing: '-0.01em' }}
      >
        Sobre o Klub
      </h2>

      <div>
        <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">
          Nome do Klub
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Clube de Tênis Carioca"
          className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none transition-colors focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
      </div>

      <div>
        <label htmlFor="slug" className="mb-1.5 block text-[13px] font-medium">
          URL do Klub
        </label>
        <div className="flex h-11 items-center rounded-[10px] border border-input bg-background pl-3.5 pr-1 transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20">
          <span className="text-[15px] text-muted-foreground">/k/</span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="clube-tenis-carioca"
            className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Letras minúsculas, números e hífen. Deve ser único.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {KLUB_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                type === t.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-transparent hover:border-foreground/20',
              )}
            >
              <span className="text-[13px] font-semibold">{t.label}</span>
              <span className="text-[11px] text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={checking}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors',
            'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70',
          )}
        >
          {checking ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Validando…
            </>
          ) : (
            <>
              Próximo
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface Step2Props {
  sports: SportCatalog[] | null;
  error: string | null;
  selected: Set<string>;
  onToggle: (code: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function Step2({ sports, error, selected, onToggle, onBack, onNext }: Step2Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2
          className="font-display text-[18px] font-bold"
          style={{ letterSpacing: '-0.01em' }}
        >
          Modalidades iniciais
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Selecione pelo menos uma. Você pode adicionar mais depois.
        </p>
      </div>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {sports === null && !error ? (
        <p className="text-[13px] text-muted-foreground">Carregando modalidades…</p>
      ) : null}

      {sports ? (
        <ul className="grid grid-cols-2 gap-2">
          {sports.map((s) => {
            const isOn = selected.has(s.code);
            return (
              <li key={s.code}>
                <button
                  type="button"
                  onClick={() => onToggle(s.code)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors',
                    isOn
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-transparent hover:border-foreground/20',
                  )}
                >
                  <div>
                    <p className="text-[13.5px] font-semibold">{s.name}</p>
                    {s.description ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {s.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border',
                      isOn
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-transparent',
                    )}
                  >
                    {isOn ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={selected.size === 0}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próximo
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

interface Step3Props {
  name: string;
  slug: string;
  type: KlubType;
  selectedSports: Set<string>;
  sports: SportCatalog[];
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

function Step3({
  name,
  slug,
  type,
  selectedSports,
  sports,
  submitting,
  error,
  onBack,
  onSubmit,
}: Step3Props) {
  const typeLabel = KLUB_TYPES.find((t) => t.value === type)?.label ?? type;
  const selectedSportsList = sports.filter((s) => selectedSports.has(s.code));

  return (
    <div className="flex flex-col gap-5">
      <h2
        className="font-display text-[18px] font-bold"
        style={{ letterSpacing: '-0.01em' }}
      >
        Confirmar
      </h2>

      <dl className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <Row label="Nome" value={name} />
        <Row label="URL" value={`/k/${slug}`} mono />
        <Row label="Tipo" value={typeLabel} />
        <Row
          label="Modalidades"
          value={selectedSportsList.map((s) => s.name).join(', ')}
        />
        <Row label="Plano" value="Trial (30 dias)" />
      </dl>

      <p className="text-[12.5px] text-muted-foreground">
        Você vira <b>Klub Admin</b> automaticamente. Pode ajustar tudo depois nas configurações.
      </p>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Criando Klub…
            </>
          ) : (
            'Criar Klub'
          )}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3 text-[13.5px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium', mono && 'font-mono text-[12.5px]')}>{value}</dd>
    </div>
  );
}
