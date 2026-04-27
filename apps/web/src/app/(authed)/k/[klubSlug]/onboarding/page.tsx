'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  HourBand,
  HourBandType,
  KlubSportProfile,
  Space,
  SportCatalog,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { addSportToKlub, listKlubSports, listSports } from '@/lib/api/sports';
import { createSpace, listKlubSpaces } from '@/lib/api/spaces';
import { cn } from '@/lib/utils';

/**
 * PR1 Onboarding Wizard — guia o KLUB_ADMIN a configurar o Klub recém
 * aprovado em 3 passos:
 * 1. Modalidades — habilita esportes (reusa add-sport-to-klub).
 * 2. Primeira quadra — cria Space com sport + indoor + faixas de horário.
 * 3. Confirmação — recap + CTA pra dashboard.
 *
 * MVP enxuto: cria 1 quadra mínima. Klub admin adiciona mais via
 * /configuracoes futuro PR. KlubConfig (cancelamento, fees) também
 * fica pra esse PR posterior.
 */

type Step = 1 | 2 | 3;

const KLUB_TYPES_DEFAULT_DURATION = 60;

export default function OnboardingPage() {
  const { klub } = useActiveKlub();
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);

  const [sports, setSports] = React.useState<SportCatalog[] | null>(null);
  const [enabledSports, setEnabledSports] = React.useState<KlubSportProfile[]>([]);
  const [spaces, setSpaces] = React.useState<Space[]>([]);

  const [stepError, setStepError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Step 1 state
  const [enabling, setEnabling] = React.useState<string | null>(null);

  // Step 2 state — 1 space novo
  const [spaceName, setSpaceName] = React.useState('Quadra 1');
  const [spaceSport, setSpaceSport] = React.useState<string>('');
  const [spaceIndoor, setSpaceIndoor] = React.useState(false);
  const [spaceHasLighting, setSpaceHasLighting] = React.useState(false);
  const [hourBands, setHourBands] = React.useState<HourBand[]>([
    {
      type: 'regular',
      startHour: 8,
      endHour: 22,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      durationByMatchType: { singles: 60, doubles: 90 },
    },
  ]);

  // Boot
  const klubId = klub?.id;
  React.useEffect(() => {
    if (!klubId) return;
    let cancelled = false;
    void Promise.all([listSports(), listKlubSports(klubId), listKlubSpaces(klubId)]).then(
      ([allSports, klubSports, klubSpaces]) => {
        if (cancelled) return;
        setSports(allSports);
        setEnabledSports(klubSports);
        setSpaces(klubSpaces);
        setSpaceSport((current) =>
          current.length > 0 ? current : (klubSports[0]?.sportCode ?? ''),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [klubId]);

  if (!klub) return null;

  async function handleEnableSport(code: string) {
    if (enabling || !klub) return;
    setEnabling(code);
    setStepError(null);
    try {
      const profile = await addSportToKlub(klub.id, code);
      setEnabledSports((prev) => [...prev, profile]);
      if (!spaceSport) setSpaceSport(code);
    } catch (err: unknown) {
      setStepError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao habilitar modalidade.',
      );
    } finally {
      setEnabling(null);
    }
  }

  async function handleCreateSpace() {
    if (submitting || !klub) return;
    if (!spaceName.trim()) {
      setStepError('Dá um nome pra quadra.');
      return;
    }
    if (!spaceSport) {
      setStepError('Escolhe a modalidade da quadra.');
      return;
    }
    if (hourBands.length === 0) {
      setStepError('Adiciona pelo menos uma faixa de horário.');
      return;
    }
    setSubmitting(true);
    setStepError(null);
    try {
      const created = await createSpace(klub.id, {
        name: spaceName.trim(),
        sportCode: spaceSport as 'tennis' | 'padel' | 'squash' | 'beach_tennis',
        indoor: spaceIndoor,
        hasLighting: spaceHasLighting,
        hourBands,
      });
      setSpaces((prev) => [...prev, created]);
      setStep(3);
    } catch (err: unknown) {
      setStepError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao criar quadra.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setStepError(null);
    if (step === 1 && enabledSports.length === 0) {
      setStepError('Habilita pelo menos uma modalidade pra continuar.');
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Pular pra Dashboard
        </Link>

        <header className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Configuração inicial
          </p>
          <h1
            className="mt-1.5 font-display text-[28px] font-bold md:text-[34px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Configure {klub.name}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Habilita as modalidades, cria sua primeira quadra e define os horários. Em 3 passos você
            abre pras reservas.
          </p>
        </header>

        <Stepper step={step} />

        <div className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
          {step === 1 ? (
            <Step1Modalidades
              sports={sports}
              enabledSports={enabledSports}
              enabling={enabling}
              onEnable={(code) => void handleEnableSport(code)}
            />
          ) : null}

          {step === 2 ? (
            <Step2PrimeiraQuadra
              klubName={klub.name}
              enabledSports={enabledSports}
              spaceName={spaceName}
              setSpaceName={setSpaceName}
              spaceSport={spaceSport}
              setSpaceSport={setSpaceSport}
              spaceIndoor={spaceIndoor}
              setSpaceIndoor={setSpaceIndoor}
              spaceHasLighting={spaceHasLighting}
              setSpaceHasLighting={setSpaceHasLighting}
              hourBands={hourBands}
              setHourBands={setHourBands}
              existingSpaces={spaces}
            />
          ) : null}

          {step === 3 ? (
            <Step3Confirmacao
              klubSlug={klub.slug}
              klubName={klub.name}
              enabledSports={enabledSports}
              spaces={spaces}
            />
          ) : null}

          {stepError ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[13px] text-destructive">
              {stepError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={enabledSports.length === 0}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Próximo
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}

          {step === 2 ? (
            <button
              type="button"
              onClick={() => void handleCreateSpace()}
              disabled={submitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Criando…
                </>
              ) : (
                <>
                  Criar quadra
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          ) : null}

          {step === 3 ? (
            <button
              type="button"
              onClick={() => router.push(`/k/${klub.slug}/dashboard`)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ir pra Dashboard
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const labels = ['Modalidades', 'Primeira quadra', 'Tudo pronto'];
  return (
    <ol className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-[hsl(var(--brand-primary-600))]'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : n}
            </span>
            <span
              className={cn(
                'truncate text-[12px] font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 ? (
              <span
                className={cn(
                  'mx-1 hidden h-px flex-1 sm:block',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1 — Modalidades ───────────────────────────────────────────────

function Step1Modalidades({
  sports,
  enabledSports,
  enabling,
  onEnable,
}: {
  sports: SportCatalog[] | null;
  enabledSports: KlubSportProfile[];
  enabling: string | null;
  onEnable: (code: string) => void;
}) {
  const enabledCodes = new Set(enabledSports.map((p) => p.sportCode));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Modalidades</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Quais esportes seu Klub oferece? Selecione pelo menos uma — você habilita mais depois.
        </p>
      </div>

      {sports === null ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {sports.map((s) => {
            const enabled = enabledCodes.has(s.code);
            const loading = enabling === s.code;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => (enabled ? null : onEnable(s.code))}
                disabled={enabled || loading}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors',
                  enabled
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
                ) : enabled ? (
                  <CheckCircle2 className="size-4 text-[hsl(142_71%_32%)]" />
                ) : (
                  <Plus className="size-4 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
        <Lightbulb className="mr-1.5 inline size-3.5" />
        Cada modalidade abre um catálogo próprio (ranking, torneios, regras de partida). Habilita só
        o que tu realmente atende.
      </div>
    </div>
  );
}

// ─── Step 2 — Primeira quadra ───────────────────────────────────────────

interface Step2Props {
  klubName: string;
  enabledSports: KlubSportProfile[];
  spaceName: string;
  setSpaceName: (v: string) => void;
  spaceSport: string;
  setSpaceSport: (v: string) => void;
  spaceIndoor: boolean;
  setSpaceIndoor: (v: boolean) => void;
  spaceHasLighting: boolean;
  setSpaceHasLighting: (v: boolean) => void;
  hourBands: HourBand[];
  setHourBands: React.Dispatch<React.SetStateAction<HourBand[]>>;
  existingSpaces: Space[];
}

function Step2PrimeiraQuadra(p: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Primeira quadra</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Cria pelo menos uma — você adiciona o resto depois nas configurações do Klub.
        </p>
      </div>

      {p.existingSpaces.length > 0 ? (
        <div className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px]">
          <CheckCircle2 className="mr-1 inline size-3.5 text-[hsl(142_71%_32%)]" />
          Você já tem {p.existingSpaces.length}{' '}
          {p.existingSpaces.length === 1 ? 'quadra' : 'quadras'} cadastrada
          {p.existingSpaces.length === 1 ? '' : 's'}:{' '}
          {p.existingSpaces.map((s) => s.name).join(', ')}. Pode pular ou adicionar mais.
        </div>
      ) : null}

      <Field label="Nome" required>
        <input
          value={p.spaceName}
          onChange={(e) => p.setSpaceName(e.target.value)}
          placeholder="Quadra 1, Saibro Central, Sala A..."
          maxLength={100}
          className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
        />
      </Field>

      <Field label="Modalidade" required>
        <div className="flex flex-wrap gap-2">
          {p.enabledSports.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Volta no passo 1 e habilita pelo menos uma modalidade.
            </p>
          ) : (
            p.enabledSports.map((s) => (
              <button
                key={s.sportCode}
                type="button"
                onClick={() => p.setSpaceSport(s.sportCode)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                  p.spaceSport === s.sportCode
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {s.name ?? s.sportCode}
              </button>
            ))
          )}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ToggleRow
          checked={p.spaceIndoor}
          onChange={p.setSpaceIndoor}
          title="Coberta"
          hint="Quadra fechada / coberta (sem chuva)"
        />
        <ToggleRow
          checked={p.spaceHasLighting}
          onChange={p.setSpaceHasLighting}
          title="Iluminação"
          hint="Permite jogos noturnos"
        />
      </div>

      <hr className="border-border" />

      <div>
        <h3 className="font-display text-base font-bold">Horários de funcionamento</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Define faixas: tipo (off-peak/regular/prime), dia da semana, horário. Pode ter várias
          faixas alternando, desde que não sobreponham mesmo dia + hora.
        </p>
      </div>

      <HourBandsEditor bands={p.hourBands} setBands={p.setHourBands} />
    </div>
  );
}

// ─── Step 3 — Confirmação ───────────────────────────────────────────────

function Step3Confirmacao({
  klubSlug,
  klubName,
  enabledSports,
  spaces,
}: {
  klubSlug: string;
  klubName: string;
  enabledSports: KlubSportProfile[];
  spaces: Space[];
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-[hsl(142_71%_32%)]">
        <Sparkles className="size-7" strokeWidth={1.8} />
      </div>
      <div>
        <h2 className="font-display text-[22px] font-bold" style={{ letterSpacing: '-0.01em' }}>
          {klubName} pronto pra reservas
        </h2>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          Cadastrou <strong>{enabledSports.length}</strong>{' '}
          {enabledSports.length === 1 ? 'modalidade' : 'modalidades'} e{' '}
          <strong>{spaces.length}</strong> {spaces.length === 1 ? 'quadra' : 'quadras'}. Já dá pra
          começar.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-left">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Próximos passos sugeridos
        </p>
        <ul className="space-y-1.5 text-[13px]">
          <li>
            • Adicionar mais quadras em <strong>Configurações</strong>
          </li>
          <li>
            • Aprovar entrada de jogadores em <strong>Solicitações</strong>
          </li>
          <li>
            • Compartilhar a URL <span className="font-mono">draftklub.com/k/{klubSlug}</span> com
            seus sócios
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── HourBands Editor ───────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 7, label: 'Dom' },
] as const;

const BAND_TYPE_LABELS: Record<HourBandType, string> = {
  off_peak: 'Off-peak',
  regular: 'Regular',
  prime: 'Prime',
};

function HourBandsEditor({
  bands,
  setBands,
}: {
  bands: HourBand[];
  setBands: React.Dispatch<React.SetStateAction<HourBand[]>>;
}) {
  function addBand() {
    setBands((prev) => [
      ...prev,
      {
        type: 'regular',
        startHour: 8,
        endHour: 12,
        daysOfWeek: [1, 2, 3, 4, 5],
        durationByMatchType: { singles: 60, doubles: KLUB_TYPES_DEFAULT_DURATION },
      },
    ]);
  }

  function removeBand(idx: number) {
    setBands((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateBand(idx: number, patch: Partial<HourBand>) {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function toggleDay(idx: number, day: number) {
    setBands((prev) =>
      prev.map((b, i) =>
        i === idx
          ? {
              ...b,
              daysOfWeek: b.daysOfWeek.includes(day)
                ? b.daysOfWeek.filter((d) => d !== day)
                : [...b.daysOfWeek, day].sort(),
            }
          : b,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {bands.map((band, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(BAND_TYPE_LABELS) as HourBandType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateBand(idx, { type: t })}
                  className={cn(
                    'inline-flex h-7 items-center rounded-md px-2.5 text-[11.5px] font-bold uppercase tracking-[0.04em] transition-colors',
                    band.type === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {BAND_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => removeBand(idx)}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remover faixa"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Das</span>
            <select
              value={band.startHour}
              onChange={(e) => updateBand(idx, { startHour: parseInt(e.target.value, 10) })}
              className="h-9 rounded-md border border-input bg-background px-2 text-[13px] outline-none"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">às</span>
            <select
              value={band.endHour}
              onChange={(e) => updateBand(idx, { endHour: parseInt(e.target.value, 10) })}
              className="h-9 rounded-md border border-input bg-background px-2 text-[13px] outline-none"
            >
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {DAYS_OF_WEEK.map((d) => {
              const on = band.daysOfWeek.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(idx, d.id)}
                  className={cn(
                    'inline-flex size-9 items-center justify-center rounded-md text-[11.5px] font-bold transition-colors',
                    on
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {bands.length < 20 ? (
        <button
          type="button"
          onClick={addBand}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border bg-background px-3.5 text-[13px] font-medium hover:bg-muted"
        >
          <Plus className="size-3.5" />
          Adicionar faixa
        </button>
      ) : null}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function ToggleRow({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      </div>
      <span
        className={cn(
          'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'size-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
