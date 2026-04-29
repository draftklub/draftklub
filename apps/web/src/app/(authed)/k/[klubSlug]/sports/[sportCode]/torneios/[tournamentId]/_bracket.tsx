'use client';

/**
 * Sprint O batch O-4 — extraído de _components.tsx (megafile 2789 linhas).
 * Cobre o lado visual da chave: BracketView, BracketByPhases, BracketSection,
 * BracketGrid, MatchCard, PlayerSlot, MatchActionModal, WalkoverActions,
 * RevertSection, RevertModal, RevertPreview e helpers de score.
 *
 * Helpers (`toErrorMessage`) duplicados temporariamente —
 * próximo batch consolida em `./_shared`.
 */

import * as React from 'react';
import { CheckCircle2, Crown, Dices, Loader2, Save, Trophy } from 'lucide-react';
import { useParams } from 'next/navigation';
import type {
  PreviewMatchRevertResult,
  TournamentBracket,
  TournamentDetail,
  TournamentMatchView,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { Banner } from '@/components/ui/banner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  applyDoubleWalkover,
  applyWalkover,
  confirmTournamentMatch,
  editTournamentMatch,
  previewMatchRevert,
  reportTournamentMatch,
  revertTournamentMatch,
} from '@/lib/api/tournaments';
import { validateMatchScore } from '@/lib/sport-validation';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function useSportCodeFromTournament(_tournament: TournamentDetail): string {
  const params = useParams<{ sportCode: string }>();
  return params.sportCode;
}

// ─── Bracket view ───────────────────────────────────────────────────────

export function BracketView({
  bracket,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  bracket: TournamentBracket | null;
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (bracket && bracket.categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(bracket.categories[0]?.id ?? null);
    }
  }, [bracket, activeCategoryId]);

  if (!bracket) {
    return (
      <EmptyState
        icon={Dices}
        title="Chave ainda não disponível"
        description="Torneio precisa ter sido sorteado primeiro."
      />
    );
  }

  if (bracket.categories.length === 0) {
    return <EmptyState icon={Trophy} title="Nenhuma categoria com matches gerados" />;
  }

  const activeCategory =
    bracket.categories.find((c) => c.id === activeCategoryId) ?? bracket.categories[0];
  if (!activeCategory) {
    return <EmptyState icon={Trophy} title="Categoria não encontrada" />;
  }

  return (
    <div className="space-y-3">
      {bracket.categories.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {bracket.categories.map((c) => {
            const isActive = c.id === activeCategoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  'inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <BracketByPhases
        matches={activeCategory.matches}
        tournament={tournament}
        meId={meId}
        canManage={canManage}
        onChanged={onChanged}
      />
    </div>
  );
}

/**
 * Render simples do bracket: agrupa por phase e mostra matches em colunas
 * verticais. Funciona pra knockout, double-elimination (winners/losers
 * separados via matchKind), round-robin (cada round = phase) e groups+
 * knockout (phases group_A/B/... + knockout). Não desenha linhas conectoras
 * — visualização é grid simples por fase.
 */
function BracketByPhases({
  matches,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  matches: TournamentMatchView[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  if (matches.length === 0) {
    return <EmptyState icon={Dices} title="Sem matches gerados" />;
  }

  // Agrupa por phase. Se houver matchKind!=main, separa em grupos.
  const byPhase = React.useMemo(() => {
    const winners = new Map<string, TournamentMatchView[]>();
    const losers = new Map<string, TournamentMatchView[]>();
    const groups = new Map<string, TournamentMatchView[]>();
    const grandFinal: TournamentMatchView[] = [];

    for (const m of matches) {
      const target =
        m.matchKind === 'losers'
          ? losers
          : m.matchKind === 'group'
            ? groups
            : m.matchKind === 'grand_final'
              ? null
              : winners;
      if (target === null) {
        grandFinal.push(m);
        continue;
      }
      const arr = target.get(m.phase) ?? [];
      arr.push(m);
      target.set(m.phase, arr);
    }

    function sortMatches(arr: TournamentMatchView[]) {
      return arr.slice().sort((a, b) => a.slotTop - b.slotTop);
    }

    return {
      winners: Array.from(winners.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      losers: Array.from(losers.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      groups: Array.from(groups.entries()).map(([p, arr]) => ({
        phase: p,
        matches: sortMatches(arr),
      })),
      grandFinal: sortMatches(grandFinal),
    };
  }, [matches]);

  const hasLosers = byPhase.losers.length > 0;
  const hasGroups = byPhase.groups.length > 0;

  const sectionProps = { tournament, meId, canManage, onChanged };
  // Grid layout só pra formats com bracket-geometry. Round-robin não tem
  // hierarquia de slots; mantém flex empilhado.
  const useGrid =
    tournament.format === 'knockout' ||
    tournament.format === 'double_elimination' ||
    tournament.format === 'groups_knockout';

  return (
    <div className="space-y-5">
      {hasGroups ? (
        <BracketSection
          title="Fase de grupos"
          phases={byPhase.groups}
          layout="flex"
          {...sectionProps}
        />
      ) : null}
      <BracketSection
        title={hasLosers ? 'Chave principal (winners)' : null}
        phases={byPhase.winners}
        layout={useGrid ? 'grid' : 'flex'}
        {...sectionProps}
      />
      {hasLosers ? (
        <BracketSection
          title="Repescagem (losers)"
          phases={byPhase.losers}
          layout="grid"
          {...sectionProps}
        />
      ) : null}
      {byPhase.grandFinal.length > 0 ? (
        <BracketSection
          title="Final"
          phases={[{ phase: 'grand_final', matches: byPhase.grandFinal }]}
          layout="flex"
          {...sectionProps}
        />
      ) : null}
    </div>
  );
}

function BracketSection({
  title,
  phases,
  tournament,
  meId,
  canManage,
  onChanged,
  layout = 'flex',
}: {
  title: string | null;
  phases: { phase: string; matches: TournamentMatchView[] }[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
  /**
   * `'flex'` empilha matches verticalmente por phase (round-robin/groups).
   * `'grid'` usa CSS Grid posicionando matches por slotTop/slotBottom (knockout/
   * losers): matches em rounds posteriores ficam visualmente entre seus
   * predecessores, replicando layout de bracket clássico.
   */
  layout?: 'flex' | 'grid';
}) {
  if (phases.length === 0) return null;
  return (
    <section className="space-y-2">
      {title ? (
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        {layout === 'grid' ? (
          <BracketGrid
            phases={phases}
            tournament={tournament}
            meId={meId}
            canManage={canManage}
            onChanged={onChanged}
          />
        ) : (
          <div className="flex min-w-max gap-3">
            {phases.map((p) => (
              <div key={p.phase} className="w-60 shrink-0 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  {labelPhase(p.phase)}
                </p>
                {p.matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    tournament={tournament}
                    meId={meId}
                    canManage={canManage}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BracketGrid({
  phases,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  phases: { phase: string; matches: TournamentMatchView[] }[];
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  // Total de "slots" — usa o maior slotBottom em todas as phases pra
  // dimensionar o grid. Min 1 pra evitar grid degenerado.
  const maxSlot = Math.max(1, ...phases.flatMap((p) => p.matches.map((m) => m.slotBottom)));
  // Ordena phases por round (estimativa: se phase é numérica, usa; senão
  // usa ordem do array que já vem ordenada).
  const phaseToCol = new Map(phases.map((p, i) => [p.phase, i + 1]));

  return (
    <div className="space-y-2">
      {/* Headers */}
      <div
        className="grid min-w-max gap-x-3"
        style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(220px, 1fr))` }}
      >
        {phases.map((p) => (
          <p
            key={p.phase}
            className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground"
          >
            {labelPhase(p.phase)}
          </p>
        ))}
      </div>

      {/* Grid bracket. Cada match span de slotTop a slotBottom (1-indexed
       * inclusive). Cards centralizados verticalmente no span pra dar
       * efeito de bracket onde rounds posteriores ficam entre os children. */}
      <div
        className="grid min-w-max gap-x-3 gap-y-1"
        style={{
          gridTemplateColumns: `repeat(${phases.length}, minmax(220px, 1fr))`,
          gridTemplateRows: `repeat(${maxSlot + 1}, minmax(40px, auto))`,
        }}
      >
        {phases.flatMap((p) =>
          p.matches.map((m) => {
            const col = phaseToCol.get(p.phase) ?? 1;
            // slotBottom é inclusive; grid-row end é exclusive, então +2
            const rowStart = m.slotTop + 1;
            const rowEnd = m.slotBottom + 2;
            return (
              <div
                key={m.id}
                className="flex flex-col justify-center"
                style={{
                  gridColumn: col,
                  gridRow: `${rowStart} / ${rowEnd}`,
                }}
              >
                <MatchCard
                  match={m}
                  tournament={tournament}
                  meId={meId}
                  canManage={canManage}
                  onChanged={onChanged}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function labelPhase(phase: string): string {
  const map: Record<string, string> = {
    final: 'Final',
    semifinal: 'Semifinal',
    quarter: 'Quartas',
    round_of_16: 'Oitavas',
    round_of_32: '16-avos',
    round_of_64: '32-avos',
    grand_final: 'Final geral',
  };
  const mapped = map[phase];
  if (mapped) return mapped;
  if (phase.startsWith('group_')) return `Grupo ${phase.replace('group_', '').toUpperCase()}`;
  if (phase.startsWith('round_')) return `Rodada ${phase.replace('round_', '')}`;
  return phase;
}

function MatchCard({
  match,
  tournament,
  meId,
  canManage,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  meId: string | null;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isCompleted = match.status === 'completed';
  const isAwaitingConfirm = match.status === 'awaiting_confirmation';
  const isPending = match.status === 'pending';
  const isBye = match.isBye || match.status === 'bye';
  const isWalkover = match.status === 'walkover' || match.status === 'double_walkover';

  const isPlayer = meId != null && (match.player1Id === meId || match.player2Id === meId);
  const playersKnown = match.player1Id != null && match.player2Id != null;
  // Clickable se há ação possível: pendente com players, awaiting confirm,
  // ou completed-and-canManage (pra eventual edit/walkover futuros).
  const actionable =
    !isBye &&
    ((isPending &&
      playersKnown &&
      (canManage || (isPlayer && tournament.resultReportingMode === 'player_with_confirm'))) ||
      (isAwaitingConfirm && (canManage || isPlayer)) ||
      (isCompleted && canManage));

  return (
    <>
      <button
        type="button"
        onClick={actionable ? () => setOpen(true) : undefined}
        disabled={!actionable}
        className={cn(
          'block w-full rounded-lg border bg-card p-2.5 text-left text-xs transition-colors',
          isCompleted && 'border-border',
          isBye && 'border-dashed opacity-60',
          isWalkover && 'border-warning/40 bg-warning/5',
          isAwaitingConfirm && 'border-warning/40 bg-warning/5',
          !isCompleted && !isBye && !isWalkover && !isAwaitingConfirm && 'border-border/60',
          actionable && 'cursor-pointer hover:border-primary/40 hover:bg-muted/30',
          !actionable && 'cursor-default',
        )}
      >
        <PlayerSlot
          name={match.player1Name}
          seed={match.seed1}
          tbdLabel={match.tbdPlayer1Label}
          isWinner={isCompleted && match.winnerId === match.player1Id}
        />
        <div className="my-1 border-t border-border/50" />
        <PlayerSlot
          name={match.player2Name}
          seed={match.seed2}
          tbdLabel={match.tbdPlayer2Label}
          isWinner={isCompleted && match.winnerId === match.player2Id}
        />
        {match.score ? (
          <p className="mt-2 text-right font-mono text-xs text-muted-foreground">{match.score}</p>
        ) : null}
        {isWalkover ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-warning-foreground">
            {match.status === 'double_walkover' ? 'WO duplo' : 'Walkover'}
          </p>
        ) : null}
        {isAwaitingConfirm ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-warning-foreground">
            Aguarda confirmação
          </p>
        ) : null}
        {match.scheduledFor && !isCompleted ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(match.scheduledFor).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : null}
      </button>
      {open ? (
        <MatchActionModal
          match={match}
          tournament={tournament}
          isPlayer={isPlayer}
          canManage={canManage}
          onClose={() => setOpen(false)}
          onChanged={() => {
            setOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function PlayerSlot({
  name,
  seed,
  tbdLabel,
  isWinner,
}: {
  name: string | null;
  seed: number | null;
  tbdLabel: string | null;
  isWinner: boolean;
}) {
  if (!name) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="truncate text-xs italic">{tbdLabel ?? 'A definir'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {isWinner ? <Crown className="size-3 text-warning" /> : null}
      {seed ? (
        <span className="inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded bg-muted px-1 text-xs font-bold tabular-nums text-muted-foreground">
          {seed}
        </span>
      ) : null}
      <span className={cn('truncate', isWinner && 'font-semibold')}>{name}</span>
    </div>
  );
}

// ─── Match action modal (PR-K3b) ────────────────────────────────────────

function MatchActionModal({
  match,
  tournament,
  isPlayer,
  canManage,
  onClose,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  isPlayer: boolean;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const isCompleted = match.status === 'completed';
  const isAwaitingConfirm = match.status === 'awaiting_confirmation';
  const isPending = match.status === 'pending';

  const canReport =
    isPending &&
    match.player1Id != null &&
    match.player2Id != null &&
    (canManage || (isPlayer && tournament.resultReportingMode === 'player_with_confirm'));
  const canConfirm = isAwaitingConfirm && (canManage || isPlayer);
  // Edit completed: só committee (vem em K4 com mais features tipo walkover).
  const canEditCompleted = isCompleted && canManage;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {isCompleted
              ? 'Resultado registrado'
              : isAwaitingConfirm
                ? 'Confirmar resultado'
                : 'Reportar resultado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <MatchSummary match={match} />

        {canReport ? (
          <ReportForm
            match={match}
            tournament={tournament}
            canManage={canManage}
            onChanged={onChanged}
          />
        ) : canConfirm ? (
          <ConfirmForm match={match} tournament={tournament} onChanged={onChanged} />
        ) : canEditCompleted ? (
          <EditForm match={match} tournament={tournament} onChanged={onChanged} />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            {isCompleted ? 'Match já encerrado.' : 'Você não pode reportar/confirmar esse match.'}
          </p>
        )}

        {/* Sprint K PR-K4: walkover (pending) e revert (completed) — committee/admin only */}
        {canManage && isPending && match.player1Id && match.player2Id ? (
          <WalkoverActions match={match} tournament={tournament} onChanged={onChanged} />
        ) : null}
        {canManage && isCompleted ? <RevertSection match={match} onChanged={onChanged} /> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchSummary({ match }: { match: TournamentMatchView }) {
  const winner =
    match.winnerId === match.player1Id
      ? match.player1Name
      : match.winnerId === match.player2Id
        ? match.player2Name
        : null;
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={cn(winner === match.player1Name && 'font-semibold')}>
          {match.player1Name ?? match.tbdPlayer1Label ?? 'A definir'}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className={cn(winner === match.player2Name && 'font-semibold')}>
          {match.player2Name ?? match.tbdPlayer2Label ?? 'A definir'}
        </span>
      </div>
      {match.score ? (
        <p className="mt-1 font-mono text-xs text-muted-foreground">{match.score}</p>
      ) : null}
      {match.scheduledFor ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(match.scheduledFor).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      ) : null}
    </div>
  );
}

function ReportForm({
  match,
  tournament,
  canManage,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [winnerId, setWinnerId] = React.useState<string>('');
  const [score, setScore] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sportCodeForValidation = useSportCodeFromTournament(tournament);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!winnerId) {
      setError('Selecione o vencedor.');
      return;
    }
    if (!match.player1Id || !match.player2Id) {
      setError('Match não tem 2 players definidos.');
      return;
    }
    const validation = validateMatchScore(sportCodeForValidation, {
      winnerId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      score: score.trim() || undefined,
    });
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'Score inválido.');
      return;
    }
    setSubmitting(true);
    try {
      await reportTournamentMatch(tournament.id, match.id, {
        winnerId,
        score: score.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao reportar.'));
      setSubmitting(false);
    }
  }

  // Mensagem contextual sobre fluxo de confirmação
  const willGoStraight = canManage || tournament.resultReportingMode === 'committee_only';

  return (
    <div className="space-y-2.5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Vencedor
        </p>
        <div className="space-y-1.5">
          {(() => {
            const p1 = match.player1Id;
            const p2 = match.player2Id;
            return (
              <>
                {p1 ? (
                  <WinnerOption
                    checked={winnerId === p1}
                    onSelect={() => setWinnerId(p1)}
                    name={match.player1Name ?? '—'}
                  />
                ) : null}
                {p2 ? (
                  <WinnerOption
                    checked={winnerId === p2}
                    onSelect={() => setWinnerId(p2)}
                    name={match.player2Name ?? '—'}
                  />
                ) : null}
              </>
            );
          })()}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Score (opcional)
        </p>
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="6-3 6-2"
          maxLength={50}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Formato livre. Ex: <code>6-3 6-2</code> ou <code>6-4 3-6 7-5</code>.
        </p>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Notas (opcional)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className={inputCls}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {willGoStraight
          ? 'Resultado vai direto pra completed; rating recalculado e bracket avança.'
          : 'Após reportar, o outro player precisa confirmar antes de virar oficial.'}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Reportar
        </button>
      </div>
    </div>
  );
}

function ConfirmForm({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirmTournamentMatch(tournament.id, match.id);
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao confirmar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      <p className="text-xs text-muted-foreground">
        Resultado já reportado. Ao confirmar, vira oficial: rating é recalculado e bracket avança o
        vencedor pro próximo match.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Confirmar
        </button>
      </div>
    </div>
  );
}

function EditForm({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [winnerId, setWinnerId] = React.useState<string>(match.winnerId ?? '');
  const [score, setScore] = React.useState(match.score ?? '');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sportCodeForValidation = useSportCodeFromTournament(tournament);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (!winnerId) {
      setError('Selecione o vencedor.');
      return;
    }
    if (!match.player1Id || !match.player2Id) {
      setError('Match não tem 2 players definidos.');
      return;
    }
    const validation = validateMatchScore(sportCodeForValidation, {
      winnerId,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      score: score.trim() || undefined,
    });
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'Score inválido.');
      return;
    }
    setSubmitting(true);
    try {
      await editTournamentMatch(tournament.id, match.id, {
        winnerId,
        score: score.trim() || undefined,
      });
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao editar.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Banner tone="warning">
        Editar resultado já registrado recalcula rating e pode afetar matches posteriores. Use só em
        correção de erro óbvio.
      </Banner>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Vencedor
        </p>
        <div className="space-y-1.5">
          {(() => {
            const p1 = match.player1Id;
            const p2 = match.player2Id;
            return (
              <>
                {p1 ? (
                  <WinnerOption
                    checked={winnerId === p1}
                    onSelect={() => setWinnerId(p1)}
                    name={match.player1Name ?? '—'}
                  />
                ) : null}
                {p2 ? (
                  <WinnerOption
                    checked={winnerId === p2}
                    onSelect={() => setWinnerId(p2)}
                    name={match.player2Name ?? '—'}
                  />
                ) : null}
              </>
            );
          })()}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
          Score
        </p>
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="6-3 6-2"
          maxLength={50}
          className={inputCls}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
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
    </div>
  );
}

function WinnerOption({
  checked,
  onSelect,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors',
        checked
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-primary bg-primary' : 'border-input bg-background',
        )}
      >
        {checked ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
      </span>
      <span className="truncate font-medium">{name}</span>
    </button>
  );
}

// ─── Walkover + Revert (PR-K4) ──────────────────────────────────────────

function WalkoverActions({
  match,
  tournament,
  onChanged,
}: {
  match: TournamentMatchView;
  tournament: TournamentDetail;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = React.useState<'p1' | 'p2' | 'double' | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');

  async function handleApply(kind: 'p1' | 'p2' | 'double') {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (kind === 'double') {
        await applyDoubleWalkover(tournament.id, match.id, {
          notes: notes.trim() || undefined,
        });
      } else {
        const winnerId = kind === 'p1' ? match.player1Id : match.player2Id;
        if (!winnerId) {
          setError('Player não definido pra aplicar walkover.');
          setSubmitting(false);
          return;
        }
        await applyWalkover(tournament.id, match.id, {
          winnerId,
          notes: notes.trim() || undefined,
        });
      }
      onChanged();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Erro ao aplicar walkover.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-warning-foreground">
        Walkover (admin)
      </p>
      <p className="text-xs text-muted-foreground">
        Use quando jogador desistir/não comparecer. Walkover simples avança o outro; double walkover
        finaliza sem vencedor.
      </p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {confirming ? (
        <div className="space-y-2">
          <p className="text-xs">
            <strong>Confirmar:</strong>{' '}
            {confirming === 'double'
              ? `Walkover duplo (ambos players desistem).`
              : `WO — ${confirming === 'p1' ? match.player1Name : match.player2Name} avança.`}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Notas (opcional, ex: motivo)"
            className={inputCls}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleApply(confirming)}
              disabled={submitting}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-warning px-3 text-xs font-semibold text-white hover:bg-warning/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3 animate-spin" /> : null}
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(null);
                setNotes('');
              }}
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirming('p1')}
            className="inline-flex h-8 items-center rounded-md border border-warning/30 bg-background px-2.5 text-xs font-semibold hover:bg-warning/10"
          >
            WO: {match.player1Name} avança
          </button>
          <button
            type="button"
            onClick={() => setConfirming('p2')}
            className="inline-flex h-8 items-center rounded-md border border-warning/30 bg-background px-2.5 text-xs font-semibold hover:bg-warning/10"
          >
            WO: {match.player2Name} avança
          </button>
          <button
            type="button"
            onClick={() => setConfirming('double')}
            className="inline-flex h-8 items-center rounded-md border border-destructive/30 bg-background px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            WO duplo
          </button>
        </div>
      )}
    </div>
  );
}

function RevertSection({
  match,
  onChanged,
}: {
  match: TournamentMatchView;
  onChanged: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-destructive">
        Reverter resultado (admin)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Desfaz o resultado: rating dos players é revertido, próximo match volta pra "scheduled" ou
        "TBD slot". Use só em correção de erro.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex h-9 items-center gap-1 rounded-md border border-destructive bg-background px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
      >
        Reverter…
      </button>
      {open ? (
        <RevertModal
          matchId={match.id}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function RevertModal({
  matchId,
  onClose,
  onSuccess,
}: {
  matchId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [preview, setPreview] = React.useState<PreviewMatchRevertResult | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    previewMatchRevert(matchId)
      .then((row) => {
        if (!cancelled) setPreview(row);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(toErrorMessage(err, 'Erro ao carregar preview.'));
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await revertTournamentMatch(matchId, { reason: reason.trim() || undefined });
      onSuccess();
    } catch (err: unknown) {
      setSubmitError(toErrorMessage(err, 'Erro ao reverter.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Reverter resultado</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {loadError ? (
          <Banner tone="error">{loadError}</Banner>
        ) : !preview ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <RevertPreview preview={preview} />
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
                Motivo (opcional, fica em audit trail)
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ex: score reportado errado por um dos players"
                className={inputCls}
              />
            </div>
            {submitError ? <Banner tone="error">{submitError}</Banner> : null}
          </>
        )}

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
            onClick={() => void handleConfirm()}
            disabled={submitting || !preview}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Reverter
          </button>
        </div>
      </div>
    </div>
  );
}

const REVERT_WARNING_LABELS: Record<string, string> = {
  prequalifier_dual_path_warning:
    'Match de prequalifier — revert pode reabrir caminhos de classificação.',
  cascade_depth_exceeded_1_level:
    'Cascata > 1 nível: matches subsequentes já completed também são afetados.',
};

function RevertPreview({ preview }: { preview: PreviewMatchRevertResult }) {
  const { affectedMatches, ratingDeltas, warnings } = preview.cascade;
  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-destructive">
        Preview do impacto
      </p>
      <div>
        <p className="font-semibold">Matches afetados ({affectedMatches.length})</p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {affectedMatches.map((m) => (
            <li key={m.id}>
              · {m.phase} #{m.bracketPosition}: {m.status} → {m.willRevertTo}
            </li>
          ))}
        </ul>
      </div>
      {ratingDeltas.length > 0 ? (
        <div>
          <p className="font-semibold">Ratings revertidos</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {ratingDeltas.map((d) => (
              <li key={d.userId}>
                · player {d.userId.slice(0, 8)}…: {d.ratingAfter} →{' '}
                <strong className="text-foreground">{d.ratingBefore}</strong> (
                {d.toRevert > 0 ? '+' : ''}
                {d.toRevert})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="rounded border border-warning/30 bg-warning/5 p-2">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-warning-foreground">
            Avisos
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {warnings.map((w) => (
              <li key={w}>· {REVERT_WARNING_LABELS[w] ?? w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
