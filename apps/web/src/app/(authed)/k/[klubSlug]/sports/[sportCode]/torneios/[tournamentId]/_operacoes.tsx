'use client';

/**
 * Sprint O batch O-5 — extraído de _components.tsx (megafile 2789 linhas).
 * Cobre a aba de operações do torneio: OperacoesView + EditTournamentSection +
 * EditTournamentModal + CancelTournamentSection + DrawSection + ScheduleSection +
 * ReportingModeSection + ScheduleModal e helpers de data/formulário.
 *
 * Helpers (inputCls, toErrorMessage, useSportCodeFromTournament) duplicados
 * temporariamente — próximo batch consolida em `./_shared`.
 */

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarRange,
  Dices,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  Space,
  TournamentDetail,
  TournamentResultReportingMode,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { listKlubSpaces } from '@/lib/api/spaces';
import {
  cancelTournament,
  drawTournament,
  scheduleTournament,
  updateReportingMode,
  updateTournament,
  type ScheduleConfigInput,
  type UpdateTournamentInput,
} from '@/lib/api/tournaments';
import { Banner } from '@/components/ui/banner';
import { cn } from '@/lib/utils';

export function OperacoesView({
  tournament,
  klubId,
  onChanged,
}: {
  tournament: TournamentDetail;
  klubId: string;
  onChanged: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const isDrawn = tournament.status !== 'draft';
  const isFinished = tournament.status === 'finished' || tournament.status === 'cancelled';

  return (
    <div className="space-y-4">
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      <DrawSection
        tournament={tournament}
        isDrawn={isDrawn}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <ScheduleSection
        tournamentId={tournament.id}
        klubId={klubId}
        isDrawn={isDrawn}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <ReportingModeSection
        tournament={tournament}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <EditTournamentSection
        tournament={tournament}
        klubId={klubId}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />

      <CancelTournamentSection
        tournament={tournament}
        isFinished={isFinished}
        onSuccess={(msg) => {
          setMessage(msg);
          setError(null);
          onChanged();
        }}
        onError={(msg) => setError(msg)}
      />
    </div>
  );
}

function EditTournamentSection({
  tournament,
  klubId,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  klubId: string;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isCancelled = tournament.status === 'cancelled';
  const disabled = isFinished || isCancelled;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-bold">Editar dados do torneio</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Edita nome, descrição, datas, modo de aprovação. Format, ranking e categorias não são
        editáveis pós-create — exigiriam recriar bracket. Bloqueado se torneio finalizado/cancelado.
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Pencil className="size-3.5" />
          Editar…
        </button>
      </div>
      {open ? (
        <EditTournamentModal
          tournament={tournament}
          klubId={klubId}
          onClose={() => setOpen(false)}
          onSuccess={(msg) => {
            setOpen(false);
            onSuccess(msg);
          }}
          onError={onError}
        />
      ) : null}
    </section>
  );
}

function EditTournamentModal({
  tournament,
  klubId,
  onClose,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  klubId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const sportCode = useSportCodeFromTournament(tournament);
  const [name, setName] = React.useState(tournament.name);
  const [description, setDescription] = React.useState(tournament.description ?? '');
  const [registrationApproval, setRegistrationApproval] = React.useState(
    tournament.registrationApproval,
  );
  const [registrationOpensAt, setRegistrationOpensAt] = React.useState(
    isoToLocal(tournament.registrationOpensAt),
  );
  const [registrationClosesAt, setRegistrationClosesAt] = React.useState(
    isoToLocal(tournament.registrationClosesAt),
  );
  const [drawDate, setDrawDate] = React.useState(isoToLocal(tournament.drawDate));
  const [prequalifierStartDate, setPrequalifierStartDate] = React.useState(
    tournament.prequalifierStartDate ? isoToLocal(tournament.prequalifierStartDate) : '',
  );
  const [prequalifierEndDate, setPrequalifierEndDate] = React.useState(
    tournament.prequalifierEndDate ? isoToLocal(tournament.prequalifierEndDate) : '',
  );
  const [mainStartDate, setMainStartDate] = React.useState(isoToLocal(tournament.mainStartDate));
  const [mainEndDate, setMainEndDate] = React.useState(
    tournament.mainEndDate ? isoToLocal(tournament.mainEndDate) : '',
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (name.trim().length < 2) {
      setLocalError('Nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const patch: UpdateTournamentInput = {};
      // Inclui só campos que mudaram pra reduzir surface da PATCH.
      if (name.trim() !== tournament.name) patch.name = name.trim();
      if ((description.trim() || null) !== (tournament.description ?? null)) {
        patch.description = description.trim() || null;
      }
      if (registrationApproval !== tournament.registrationApproval) {
        patch.registrationApproval = registrationApproval;
      }
      if (localToIso(registrationOpensAt) !== tournament.registrationOpensAt) {
        patch.registrationOpensAt = localToIso(registrationOpensAt);
      }
      if (localToIso(registrationClosesAt) !== tournament.registrationClosesAt) {
        patch.registrationClosesAt = localToIso(registrationClosesAt);
      }
      if (localToIso(drawDate) !== tournament.drawDate) {
        patch.drawDate = localToIso(drawDate);
      }
      if (tournament.hasPrequalifiers) {
        const oldPreqStart = tournament.prequalifierStartDate ?? null;
        const newPreqStart = prequalifierStartDate ? localToIso(prequalifierStartDate) : null;
        if (newPreqStart !== oldPreqStart) patch.prequalifierStartDate = newPreqStart;
        const oldPreqEnd = tournament.prequalifierEndDate ?? null;
        const newPreqEnd = prequalifierEndDate ? localToIso(prequalifierEndDate) : null;
        if (newPreqEnd !== oldPreqEnd) patch.prequalifierEndDate = newPreqEnd;
      }
      if (localToIso(mainStartDate) !== tournament.mainStartDate) {
        patch.mainStartDate = localToIso(mainStartDate);
      }
      const oldMainEnd = tournament.mainEndDate ?? null;
      const newMainEnd = mainEndDate ? localToIso(mainEndDate) : null;
      if (newMainEnd !== oldMainEnd) patch.mainEndDate = newMainEnd;

      if (Object.keys(patch).length === 0) {
        setLocalError('Nenhum campo alterado.');
        setSubmitting(false);
        return;
      }

      await updateTournament(klubId, sportCode, tournament.id, patch);
      onSuccess('Torneio atualizado.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao atualizar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Editar torneio</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {localError ? <Banner tone="error">{localError}</Banner> : null}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Nome
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Descrição
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Aprovação de inscrição
          </p>
          <select
            value={registrationApproval}
            onChange={(e) => setRegistrationApproval(e.target.value as 'auto' | 'committee')}
            className={inputCls}
          >
            <option value="auto">Automática</option>
            <option value="committee">Comissão aprova</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DateField
            label="Inscrições abrem"
            value={registrationOpensAt}
            onChange={setRegistrationOpensAt}
          />
          <DateField
            label="Inscrições fecham"
            value={registrationClosesAt}
            onChange={setRegistrationClosesAt}
          />
          <DateField label="Sorteio" value={drawDate} onChange={setDrawDate} />
          <DateField
            label="Início fase principal"
            value={mainStartDate}
            onChange={setMainStartDate}
          />
          <DateField
            label="Fim fase principal (opcional)"
            value={mainEndDate}
            onChange={setMainEndDate}
          />
        </div>

        {tournament.hasPrequalifiers ? (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 sm:grid-cols-2">
            <DateField
              label="Pré-qualificatória — início"
              value={prequalifierStartDate}
              onChange={setPrequalifierStartDate}
            />
            <DateField
              label="Pré-qualificatória — fim"
              value={prequalifierEndDate}
              onChange={setPrequalifierEndDate}
            />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              <Save className="size-3.5" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

/** Converte ISO 8601 UTC pra "YYYY-MM-DDTHH:mm" local pra <input type="datetime-local">. */
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(local: string): string {
  return new Date(local).toISOString();
}

function useSportCodeFromTournament(_tournament: TournamentDetail): string {
  // sportCode vive na URL; lemos via useParams. Wrapper hook pra evitar
  // ter que passar sportCode por props pelas seções inteiras.
  const params = useParams<{ sportCode: string }>();
  return params.sportCode;
}

function CancelTournamentSection({
  tournament,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const isCancelled = tournament.status === 'cancelled';
  const disabled = isFinished || isCancelled || submitting;

  async function handleCancel() {
    if (disabled) return;
    if (
      !window.confirm(
        `Cancelar "${tournament.name}"?\n\nMatches que ainda não rolaram são marcados como cancelled. Inscritos perdem acesso. Operação reversível só por SQL/admin direto no banco.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await cancelTournament(tournament.id, { reason: reason.trim() || undefined });
      onSuccess('Torneio cancelado.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao cancelar.'));
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="size-4 text-destructive" />
        <h3 className="font-display text-sm font-bold text-destructive">Cancelar torneio</h3>
        {isCancelled ? (
          <span className="inline-flex h-5 items-center rounded-full bg-destructive/15 px-2 text-xs font-bold uppercase tracking-[0.06em] text-destructive">
            Já cancelado
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Cancela o torneio inteiro. Status vira 'cancelled', matches futuros não rolam, players
        recebem notificação. Use só pra abortar evento que não vai acontecer mais.
      </p>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Motivo (opcional)
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Ex: chuva persistente; mudança de calendário; etc."
          className={inputCls}
          disabled={disabled}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => void handleCancel()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-destructive bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <XCircle className="size-3.5" />
          )}
          Cancelar torneio
        </button>
      </div>
    </section>
  );
}

function DrawSection({
  tournament,
  isDrawn,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  isDrawn: boolean;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const disabled = isFinished || submitting;

  async function handleDraw() {
    if (disabled) return;
    if (
      !window.confirm(
        `Sortear chave de "${tournament.name}"?\n\nMatches serão gerados a partir das ${tournament.entryCount} inscrições aprovadas. Após sortear, mover players entre categorias deixa de ser trivial.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await drawTournament(tournament.id);
      onSuccess('Chave sorteada — veja a aba "Chave".');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao sortear.'));
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Dices className="size-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-bold">Sortear chave</h3>
        {isDrawn ? (
          <span className="inline-flex h-5 items-center rounded-full bg-success/12 px-2 text-xs font-bold uppercase tracking-[0.06em] text-success">
            Já sorteada
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Gera matches do bracket aplicando seeding por rating. Pra knockout/double-elim, players são
        distribuídos com bye automático se número não for potência de 2. Pra round-robin, todos
        contra todos.
      </p>
      <div>
        <button
          type="button"
          onClick={() => void handleDraw()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Dices className="size-3.5" />
          )}
          {isDrawn ? 'Re-sortear' : 'Sortear'}
        </button>
      </div>
    </section>
  );
}

function ScheduleSection({
  tournamentId,
  klubId,
  isDrawn,
  isFinished,
  onSuccess,
  onError,
}: {
  tournamentId: string;
  klubId: string;
  isDrawn: boolean;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const disabled = isFinished || !isDrawn;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="size-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-bold">Distribuir agenda</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Aloca matches em quadras+horários respeitando duração da partida, intervalo entre matches e
        descanso mínimo de cada player. Pré-requisito: chave já sorteada.
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Settings2 className="size-3.5" />
          Configurar agenda
        </button>
      </div>
      {open ? (
        <ScheduleModal
          tournamentId={tournamentId}
          klubId={klubId}
          onClose={() => setOpen(false)}
          onSuccess={(msg) => {
            setOpen(false);
            onSuccess(msg);
          }}
          onError={onError}
        />
      ) : null}
    </section>
  );
}

function ReportingModeSection({
  tournament,
  isFinished,
  onSuccess,
  onError,
}: {
  tournament: TournamentDetail;
  isFinished: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [mode, setMode] = React.useState<TournamentResultReportingMode>(
    tournament.resultReportingMode,
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setMode(tournament.resultReportingMode);
  }, [tournament.resultReportingMode]);

  const dirty = mode !== tournament.resultReportingMode;
  const disabled = isFinished || submitting || !dirty;

  async function handleSave() {
    if (disabled) return;
    setSubmitting(true);
    try {
      await updateReportingMode(tournament.id, mode);
      onSuccess(
        mode === 'committee_only'
          ? 'Modo atualizado: comissão reporta resultados.'
          : 'Modo atualizado: player reporta + outro confirma.',
      );
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao atualizar modo.'));
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="size-4 text-muted-foreground" />
        <h3 className="font-display text-sm font-bold">Modo de reportagem</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Define quem pode reportar resultado de match. <strong>Comissão reporta</strong> é mais
        controlado. <strong>Player + confirma</strong> reduz fricção mas exige confirmação do rival.
      </p>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as TournamentResultReportingMode)}
        disabled={isFinished || submitting}
        className={inputCls}
      >
        <option value="committee_only">Comissão reporta</option>
        <option value="player_with_confirm">Player reporta + outro confirma</option>
      </select>
      <div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Salvar
        </button>
      </div>
    </section>
  );
}

// ─── Schedule modal ─────────────────────────────────────────────────────

function ScheduleModal({
  tournamentId,
  klubId,
  onClose,
  onSuccess,
  onError,
}: {
  tournamentId: string;
  klubId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [spaces, setSpaces] = React.useState<Space[] | null>(null);
  const [dates, setDates] = React.useState<string[]>([formatToday()]);
  const [startHour, setStartHour] = React.useState(8);
  const [endHour, setEndHour] = React.useState(22);
  const [matchDurationMinutes, setMatchDurationMinutes] = React.useState(60);
  const [breakBetweenMatchesMinutes, setBreakBetweenMatchesMinutes] = React.useState(15);
  const [restRuleMinutes, setRestRuleMinutes] = React.useState(60);
  const [spaceIds, setSpaceIds] = React.useState<string[]>([]);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    listKlubSpaces(klubId)
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((s) => s.status === 'active');
        setSpaces(active);
        // Pre-select all active spaces by default
        setSpaceIds(active.map((s) => s.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) setBootError(toErrorMessage(err, 'Erro ao carregar quadras.'));
      });
    return () => {
      cancelled = true;
    };
  }, [klubId]);

  function addDate() {
    setDates((prev) => [...prev, formatToday()]);
  }
  function updateDate(idx: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === idx ? value : d)));
  }
  function removeDate(idx: number) {
    setDates((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleSpace(id: string) {
    setSpaceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (dates.length === 0) {
      setLocalError('Adicione pelo menos uma data.');
      return;
    }
    if (endHour <= startHour) {
      setLocalError('Hora final deve ser maior que inicial.');
      return;
    }
    if (spaceIds.length === 0) {
      setLocalError('Escolha pelo menos uma quadra.');
      return;
    }
    setSubmitting(true);
    try {
      const config: ScheduleConfigInput = {
        availableDates: dates,
        startHour,
        endHour,
        matchDurationMinutes,
        breakBetweenMatchesMinutes,
        restRuleMinutes,
        spaceIds,
      };
      await scheduleTournament(tournamentId, config);
      onSuccess('Agenda distribuída — matches alocados em quadras+horários.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao agendar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Distribuir agenda</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {bootError ? <Banner tone="error">{bootError}</Banner> : null}
        {localError ? <Banner tone="error">{localError}</Banner> : null}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Datas disponíveis
          </p>
          <ul className="space-y-2">
            {dates.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="date"
                  value={d}
                  onChange={(e) => updateDate(i, e.target.value)}
                  className={cn(inputCls, 'flex-1')}
                />
                {dates.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    aria-label="Remover data"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addDate}
            className="mt-2 inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            <Plus className="size-3" />
            Adicionar data
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Início (h)
            </p>
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Fim (h)
            </p>
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Duração match (min)
            </p>
            <input
              type="number"
              min={30}
              max={360}
              step={5}
              value={matchDurationMinutes}
              onChange={(e) => setMatchDurationMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Break entre matches
            </p>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={breakBetweenMatchesMinutes}
              onChange={(e) => setBreakBetweenMatchesMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Descanso mínimo do player (min)
            </p>
            <input
              type="number"
              min={0}
              max={360}
              step={15}
              value={restRuleMinutes}
              onChange={(e) => setRestRuleMinutes(Number(e.target.value))}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tempo mínimo entre 2 matches do mesmo player.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Quadras
          </p>
          {!spaces ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : spaces.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma quadra ativa no Klub. Adicione em Configurar Klub → Quadras.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {spaces.map((s) => {
                const checked = spaceIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs transition-colors',
                        checked ? 'border-primary bg-primary/5' : 'border-border bg-background',
                      )}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleSpace(s.id)} />
                      <span className="flex-1">{s.name}</span>
                      {s.indoor ? (
                        <span className="text-xs uppercase text-muted-foreground">indoor</span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
              <CalendarRange className="size-3.5" />
            )}
            Distribuir
          </button>
        </div>
      </div>
    </div>
  );
}

function formatToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
