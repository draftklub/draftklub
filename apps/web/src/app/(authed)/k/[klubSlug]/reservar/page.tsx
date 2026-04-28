'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Sun,
  Sunset,
  Moon,
  Users,
} from 'lucide-react';
import type { Space } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { listKlubSpaces } from '@/lib/api/spaces';
import {
  createBooking,
  getSpaceAvailability,
  type MatchType,
  type SpaceAvailability,
  type SpaceAvailabilitySlot,
} from '@/lib/api/bookings';
import { cn } from '@/lib/utils';

/**
 * PR2a — fluxo de reserva mobile-first. 3 steps:
 *
 * 1. Quadra: lista de Spaces do Klub (filtrável por sport).
 * 2. Data + horário: 14 dias forward + grid de slots do availability handler.
 * 3. Confirmação: mostra resumo + match type + cria booking via POST.
 *
 * Layout otimizado pra polegar (botões grandes, slots em grid de 3-4
 * colunas em mobile, sticky bottom action). Tap targets ≥44px.
 */

type Step = 1 | 2 | 3;

const PERIOD_RANGES: Record<
  'morning' | 'afternoon' | 'evening',
  [number, number, string, typeof Sun]
> = {
  morning: [6, 12, 'Manhã', Sun],
  afternoon: [12, 18, 'Tarde', Sunset],
  evening: [18, 23, 'Noite', Moon],
};

export default function ReservarPage() {
  const { klub } = useActiveKlub();
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);
  const [spaces, setSpaces] = React.useState<Space[] | null>(null);
  const [selectedSpace, setSelectedSpace] = React.useState<Space | null>(null);
  const [matchType, setMatchType] = React.useState<MatchType>('singles');

  const [dateISO, setDateISO] = React.useState<string>(() => todayISO());
  const [availability, setAvailability] = React.useState<SpaceAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<SpaceAvailabilitySlot | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ id: string } | null>(null);

  const klubId = klub?.id;

  // Boot — carrega quadras do Klub.
  React.useEffect(() => {
    if (!klubId) return;
    let cancelled = false;
    void listKlubSpaces(klubId)
      .then((data) => {
        if (cancelled) return;
        const active = data.filter((s) => s.status === 'active' && s.bookingActive);
        setSpaces(active);
      })
      .catch(() => {
        if (!cancelled) setSpaces([]);
      });
    return () => {
      cancelled = true;
    };
  }, [klubId]);

  // Carrega availability sempre que muda quadra/data/matchType (no step 2).
  React.useEffect(() => {
    if (step !== 2 || !selectedSpace) return;
    let cancelled = false;
    setAvailabilityLoading(true);
    setStepError(null);
    void getSpaceAvailability(selectedSpace.id, dateISO, matchType)
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStepError(err instanceof Error ? err.message : 'Erro ao carregar horários.');
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, selectedSpace, dateISO, matchType]);

  if (!klub) return null;

  async function handleConfirm() {
    if (submitting || !selectedSpace || !selectedSlot || !klub) return;
    setSubmitting(true);
    setStepError(null);
    try {
      const booking = await createBooking(klub.id, {
        spaceId: selectedSpace.id,
        startsAt: selectedSlot.startTime,
        matchType,
        bookingType: 'player_match',
      });
      setSuccess({ id: booking.id });
    } catch (err: unknown) {
      setStepError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao confirmar reserva.',
      );
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SuccessView
        klubSlug={klub.slug}
        klubName={klub.name}
        space={selectedSpace}
        slot={selectedSlot}
        onDone={() => router.push(`/k/${klub.slug}/dashboard`)}
        onAnother={() => {
          setSuccess(null);
          setSelectedSlot(null);
          setStep(2);
        }}
      />
    );
  }

  return (
    <main className="flex-1 overflow-y-auto pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-10">
        <Link
          href={`/k/${klub.slug}/dashboard`}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>

        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[hsl(var(--brand-primary-600))]">
            Reservar quadra
          </p>
          <h1
            className="mt-1 font-display text-[24px] font-bold leading-tight md:text-[30px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {klub.name}
          </h1>
        </header>

        <Stepper step={step} />

        <div className="mt-6 rounded-xl border border-border bg-card p-4 md:p-6">
          {step === 1 ? (
            <Step1Quadra
              spaces={spaces}
              selectedSpace={selectedSpace}
              onSelect={(s) => {
                setSelectedSpace(s);
                // Ajusta matchType se o sport mudou e o anterior não é permitido
                if (s.allowedMatchTypes.length > 0 && !s.allowedMatchTypes.includes(matchType)) {
                  setMatchType(s.allowedMatchTypes[0] ?? 'singles');
                }
              }}
            />
          ) : null}

          {step === 2 ? (
            <Step2DataHorario
              space={selectedSpace}
              dateISO={dateISO}
              setDateISO={setDateISO}
              matchType={matchType}
              setMatchType={setMatchType}
              availability={availability}
              loading={availabilityLoading}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
            />
          ) : null}

          {step === 3 ? (
            <Step3Confirmar space={selectedSpace} slot={selectedSlot} matchType={matchType} />
          ) : null}

          {stepError ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] text-destructive">
              {stepError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Sticky bottom action bar — mobile-first */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
            }}
            disabled={step === 1 || submitting}
            className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                if (!selectedSpace) {
                  setStepError('Escolhe uma quadra.');
                  return;
                }
                setStep(2);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none sm:px-6"
            >
              Próximo
              <ArrowRight className="size-4" />
            </button>
          ) : null}

          {step === 2 ? (
            <button
              type="button"
              onClick={() => {
                setStepError(null);
                if (!selectedSlot) {
                  setStepError('Escolhe um horário disponível.');
                  return;
                }
                setStep(3);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none sm:px-6"
            >
              Próximo
              <ArrowRight className="size-4" />
            </button>
          ) : null}

          {step === 3 ? (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70 sm:flex-none sm:px-6"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Confirmar reserva
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const labels = ['Quadra', 'Data e horário', 'Confirmar'];
  return (
    <ol className="flex items-center gap-1.5">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-[hsl(var(--brand-primary-600))]'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3" /> : n}
            </span>
            <span
              className={cn(
                'truncate text-[11.5px] font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1 — Escolher quadra ──────────────────────────────────────────

function Step1Quadra({
  spaces,
  selectedSpace,
  onSelect,
}: {
  spaces: Space[] | null;
  selectedSpace: Space | null;
  onSelect: (s: Space) => void;
}) {
  if (spaces === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="font-display text-[14px] font-bold">Sem quadras disponíveis</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Esse Klub ainda não cadastrou quadras pra reserva.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display text-[15px] font-bold">Qual quadra?</h2>
      <ul className="space-y-2">
        {spaces.map((s) => {
          const selected = selectedSpace?.id === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary' : 'border-border',
                  )}
                >
                  {selected ? <Check className="size-3 text-primary-foreground" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[14px] font-bold">{s.name}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {s.sportCode ? sportLabel(s.sportCode) : 'Sem modalidade'} ·{' '}
                    {s.indoor ? 'Coberta' : 'Aberta'}
                    {s.hasLighting ? ' · Iluminação' : ''}
                    {s.surface ? ` · ${surfaceLabel(s.surface)}` : ''}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Step 2 — Data + Horário ───────────────────────────────────────────

function Step2DataHorario({
  space,
  dateISO,
  setDateISO,
  matchType,
  setMatchType,
  availability,
  loading,
  selectedSlot,
  setSelectedSlot,
}: {
  space: Space | null;
  dateISO: string;
  setDateISO: (v: string) => void;
  matchType: MatchType;
  setMatchType: (v: MatchType) => void;
  availability: SpaceAvailability | null;
  loading: boolean;
  selectedSlot: SpaceAvailabilitySlot | null;
  setSelectedSlot: (s: SpaceAvailabilitySlot | null) => void;
}) {
  const allowedMatchTypes = space?.allowedMatchTypes ?? ['singles', 'doubles'];
  const days = nextNDays(14);
  const slotsByPeriod = groupSlotsByPeriod(availability?.slots ?? []);

  return (
    <div className="space-y-5">
      {space ? (
        <p className="text-[12px] text-muted-foreground">
          Reservando em <strong className="text-foreground">{space.name}</strong>
        </p>
      ) : null}

      {/* Match type — só mostra se a quadra suporta os 2 */}
      {allowedMatchTypes.length > 1 ? (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Tipo de jogo
          </p>
          <div className="flex gap-2">
            <MatchTypePill
              active={matchType === 'singles'}
              label="Singles"
              hint="2 jogadores"
              onClick={() => setMatchType('singles')}
            />
            <MatchTypePill
              active={matchType === 'doubles'}
              label="Doubles"
              hint="4 jogadores"
              onClick={() => setMatchType('doubles')}
            />
          </div>
        </div>
      ) : null}

      {/* Data — scroll horizontal de 14 dias */}
      <div>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Data
        </p>
        <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
          <div className="flex gap-2 pb-1">
            {days.map((d) => (
              <DayChip
                key={d.iso}
                iso={d.iso}
                weekday={d.weekday}
                day={d.day}
                month={d.month}
                active={d.iso === dateISO}
                onClick={() => {
                  setDateISO(d.iso);
                  setSelectedSlot(null);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slots */}
      <div>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Horário
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !availability || availability.slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-center text-[12.5px] text-muted-foreground">
            Sem horários configurados para essa data.
          </div>
        ) : (
          <div className="space-y-4">
            {(['morning', 'afternoon', 'evening'] as const).map((period) => {
              const periodSlots = slotsByPeriod[period];
              if (periodSlots.length === 0) return null;
              const [, , label, Icon] = PERIOD_RANGES[period];
              return (
                <div key={period}>
                  <p className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Icon className="size-3" />
                    {label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {periodSlots.map((slot) => (
                      <SlotButton
                        key={slot.startTime}
                        slot={slot}
                        active={selectedSlot?.startTime === slot.startTime}
                        onClick={() => (slot.status === 'available' ? setSelectedSlot(slot) : null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Confirmar ────────────────────────────────────────────────

function Step3Confirmar({
  space,
  slot,
  matchType,
}: {
  space: Space | null;
  slot: SpaceAvailabilitySlot | null;
  matchType: MatchType;
}) {
  if (!space || !slot) {
    return (
      <p className="text-[13px] text-muted-foreground">Volta um passo e completa as escolhas.</p>
    );
  }
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  const date = start.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const startLabel = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const endLabel = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-[15px] font-bold">Tudo certo?</h2>

      <div className="rounded-lg border border-border bg-background">
        <ReviewRow icon={MapPin} label="Quadra">
          <p className="font-display text-[14px] font-bold">{space.name}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {space.sportCode ? sportLabel(space.sportCode) : ''}
            {space.indoor ? ' · Coberta' : ' · Aberta'}
          </p>
        </ReviewRow>
        <ReviewRow icon={CalendarDays} label="Data">
          <p className="capitalize text-[14px]">{date}</p>
        </ReviewRow>
        <ReviewRow icon={Clock} label="Horário">
          <p className="text-[14px]">
            {startLabel} – {endLabel}
          </p>
          <p className="text-[11.5px] text-muted-foreground">{durationMin} min</p>
        </ReviewRow>
        <ReviewRow icon={Users} label="Tipo">
          <p className="text-[14px]">{matchType === 'singles' ? 'Singles' : 'Doubles'}</p>
        </ReviewRow>
      </div>

      <p className="text-[11.5px] text-muted-foreground">
        Você é o jogador principal. Outros participantes podem ser adicionados depois pela tela do
        booking.
      </p>
    </div>
  );
}

// ─── Success ───────────────────────────────────────────────────────────

function SuccessView({
  klubSlug,
  klubName,
  space,
  slot,
  onDone,
  onAnother,
}: {
  klubSlug: string;
  klubName: string;
  space: Space | null;
  slot: SpaceAvailabilitySlot | null;
  onDone: () => void;
  onAnother: () => void;
}) {
  const date = slot
    ? new Date(slot.startTime).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      })
    : '';
  const time = slot
    ? new Date(slot.startTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-success">
          <CheckCircle2 className="size-7" strokeWidth={1.8} />
        </div>
        <h1
          className="mt-6 font-display text-[26px] font-bold"
          style={{ letterSpacing: '-0.02em' }}
        >
          Reservado!
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {space?.name} no {klubName} · <span className="capitalize">{date}</span> às {time}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAnother}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 text-[14px] font-semibold transition-colors hover:bg-muted"
          >
            Reservar outro horário
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar pro Klub
            <ArrowRight className="size-3.5" />
          </button>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Você verá essa reserva em{' '}
          <Link href={`/k/${klubSlug}/dashboard`} className="underline">
            {klubSlug}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

// ─── Slot button (touch-friendly) ──────────────────────────────────────

function SlotButton({
  slot,
  active,
  onClick,
}: {
  slot: SpaceAvailabilitySlot;
  active: boolean;
  onClick: () => void;
}) {
  const time = new Date(slot.startTime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const disabled = slot.status !== 'available';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex h-12 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : disabled
            ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through opacity-60'
            : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5',
      )}
    >
      {time}
    </button>
  );
}

// ─── Helpers visuais ───────────────────────────────────────────────────

function MatchTypePill({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 flex-1 flex-col items-start justify-center rounded-lg border px-3 transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span className={cn('text-[13px] font-semibold', active ? 'text-foreground' : '')}>
        {label}
      </span>
      <span className="text-[10.5px] text-muted-foreground">{hint}</span>
    </button>
  );
}

function DayChip({
  iso,
  weekday,
  day,
  month,
  active,
  onClick,
}: {
  iso: string;
  weekday: string;
  day: number;
  month: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-iso={iso}
      className={cn(
        'flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span className="text-[10px] font-semibold uppercase">{weekday}</span>
      <span className="font-display text-[18px] font-bold leading-none">{day}</span>
      <span className="mt-0.5 text-[9.5px] uppercase opacity-80">{month}</span>
    </button>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border p-3 last:border-b-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers de data/etc ───────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextNDays(n: number): { iso: string; weekday: string; day: number; month: string }[] {
  const out: { iso: string; weekday: string; day: number; month: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    out.push({ iso, weekday, day: d.getDate(), month });
  }
  return out;
}

function groupSlotsByPeriod(slots: SpaceAvailabilitySlot[]): {
  morning: SpaceAvailabilitySlot[];
  afternoon: SpaceAvailabilitySlot[];
  evening: SpaceAvailabilitySlot[];
} {
  const out = {
    morning: [] as SpaceAvailabilitySlot[],
    afternoon: [] as SpaceAvailabilitySlot[],
    evening: [] as SpaceAvailabilitySlot[],
  };
  for (const slot of slots) {
    const h = new Date(slot.startTime).getHours();
    if (h < 12) out.morning.push(slot);
    else if (h < 18) out.afternoon.push(slot);
    else out.evening.push(slot);
  }
  return out;
}

function sportLabel(code: string): string {
  const map: Record<string, string> = {
    tennis: 'Tênis',
    padel: 'Padel',
    squash: 'Squash',
    beach_tennis: 'Beach tennis',
  };
  return map[code] ?? code;
}

function surfaceLabel(s: string): string {
  const map: Record<string, string> = {
    clay: 'Saibro',
    hard: 'Rápida',
    grass: 'Grama',
    synthetic: 'Sintética',
    carpet: 'Carpete',
  };
  return map[s] ?? s;
}
