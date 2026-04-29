'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Loader2,
  Minus,
  Plus,
  Swords,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import type { RankingDetail, RankingPlayerEntry } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { enrollPlayerInRanking, getRanking, submitCasualMatch } from '@/lib/api/rankings';
import { validateMatchScore } from '@/lib/sport-validation';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const ORDER_BY_LABELS: Record<string, string> = {
  rating: 'Rating',
  tournament_points: 'Pontos de torneio',
  combined: 'Combinado',
};

const ENGINE_LABELS: Record<string, string> = {
  elo: 'Elo',
  win_loss: 'Win/Loss',
  points: 'Pontos',
};

export default function RankingDetailPage() {
  const params = useParams<{ klubSlug: string; sportCode: string; rankingId: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const rankingId = params.rankingId;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [data, setData] = React.useState<RankingDetail | null>(null);
  const [meId, setMeId] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void getMe()
      .then((me) => {
        if (!cancelled) setMeId(me.id);
      })
      .catch(() => null);
    getRanking(klub.id, sportCode, rankingId)
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar ranking.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode, rankingId, reload]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          back={{ href: `/k/${klub.slug}/sports/${sportCode}/rankings`, label: `Rankings · ${sportLabel}` }}
          eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
          title={data?.name ?? ''}
          description={
            data ? (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>{data.type}</span>
                {data.gender ? <span>· {data.gender}</span> : null}
                {data.ageMin || data.ageMax ? (
                  <span>
                    · {data.ageMin ?? 0}–{data.ageMax ?? '∞'} anos
                  </span>
                ) : null}
                <span>· engine {ENGINE_LABELS[data.ratingEngine] ?? data.ratingEngine}</span>
                <span>· ordenado por {ORDER_BY_LABELS[data.orderBy] ?? data.orderBy}</span>
              </span>
            ) : undefined
          }
        />

        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : data === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>

            {actionMessage ? (
              <Banner tone="success">{actionMessage}</Banner>
            ) : null}

            <CasualMatchActions
              klubId={klub.id}
              sportCode={sportCode}
              rankingId={rankingId}
              ranking={data}
              meId={meId}
              onSuccess={(msg) => {
                setActionMessage(msg);
                setError(null);
                setReload((n) => n + 1);
              }}
              onError={(msg) => {
                setError(msg);
                setActionMessage(null);
              }}
            />

            <PlayerTable players={data.players} orderBy={data.orderBy} />
          </>
        )}
      </div>
    </main>
  );
}

// ─── Casual match actions (PR-K3c) ──────────────────────────────────────

function CasualMatchActions({
  klubId,
  sportCode,
  rankingId,
  ranking,
  meId,
  onSuccess,
  onError,
}: {
  klubId: string;
  sportCode: string;
  rankingId: string;
  ranking: RankingDetail;
  meId: string | null;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [matchOpen, setMatchOpen] = React.useState(false);
  const [enrolling, setEnrolling] = React.useState(false);

  if (!meId) return null;
  const isEnrolled = ranking.players.some((p) => p.userId === meId);
  const acceptsCasual = ranking.includesCasualMatches;

  if (!acceptsCasual) {
    return (
      <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
        Esse ranking não considera partidas casuais — só matches de torneio contam.
      </p>
    );
  }

  async function handleEnroll() {
    if (enrolling) return;
    setEnrolling(true);
    try {
      await enrollPlayerInRanking(klubId, sportCode, rankingId);
      onSuccess('Você entrou no ranking. Bons jogos!');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao se inscrever no ranking.'));
      setEnrolling(false);
    }
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      {isEnrolled ? (
        <>
          <div className="text-xs">
            <p className="font-display text-sm font-bold text-foreground">Reportar partida</p>
            <p className="mt-0.5 text-muted-foreground">
              Match casual entre 2 players inscritos. Após reportar, o outro precisa confirmar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMatchOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Swords className="size-3.5" />
            Reportar partida
          </button>
        </>
      ) : (
        <>
          <div className="text-xs">
            <p className="font-display text-sm font-bold text-foreground">
              Você ainda não está nesse ranking
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Entre pra começar a ranquear partidas casuais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleEnroll()}
            disabled={enrolling}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {enrolling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Entrar no ranking
          </button>
        </>
      )}

      {matchOpen ? (
        <SubmitMatchModal
          ranking={ranking}
          sportCode={sportCode}
          meId={meId}
          onClose={() => setMatchOpen(false)}
          onSuccess={(msg) => {
            setMatchOpen(false);
            onSuccess(msg);
          }}
          onError={onError}
        />
      ) : null}
    </section>
  );
}

function SubmitMatchModal({
  ranking,
  sportCode,
  meId,
  onClose,
  onSuccess,
  onError,
}: {
  ranking: RankingDetail;
  sportCode: string;
  meId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  // Player1 default = me. Player2 = vazio.
  const [player1Id, setPlayer1Id] = React.useState<string>(meId);
  const [player2Id, setPlayer2Id] = React.useState<string>('');
  const [winnerId, setWinnerId] = React.useState<string>('');
  const [score, setScore] = React.useState('');
  const [playedAt, setPlayedAt] = React.useState(formatNowLocal());
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Player1 e Player2 não podem ser o mesmo.
  const eligibleForP2 = ranking.players.filter((p) => p.userId !== player1Id);
  // Auto-deselecionar player2 se ficou == player1
  React.useEffect(() => {
    if (player2Id === player1Id) setPlayer2Id('');
    if (winnerId && winnerId !== player1Id && winnerId !== player2Id) setWinnerId('');
  }, [player1Id, player2Id, winnerId]);

  async function handleSubmit() {
    if (submitting) return;
    setLocalError(null);
    if (!player1Id || !player2Id) {
      setLocalError('Escolha os 2 jogadores.');
      return;
    }
    if (player1Id === player2Id) {
      setLocalError('Player 1 e Player 2 precisam ser diferentes.');
      return;
    }
    if (!winnerId) {
      setLocalError('Escolha o vencedor.');
      return;
    }
    const validation = validateMatchScore(sportCode, {
      winnerId,
      player1Id,
      player2Id,
      score: score.trim() || undefined,
    });
    if (!validation.valid) {
      setLocalError(validation.errors[0] ?? 'Score inválido.');
      return;
    }
    setSubmitting(true);
    try {
      await submitCasualMatch({
        rankingId: ranking.id,
        player1Id,
        player2Id,
        winnerId,
        score: score.trim() || undefined,
        playedAt: playedAt ? new Date(playedAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess('Partida reportada. Aguarda confirmação do oponente.');
    } catch (err: unknown) {
      onError(toErrorMessage(err, 'Erro ao reportar partida.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md space-y-3 rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Reportar partida casual</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {localError ? (
          <Banner tone="error">{localError}</Banner>
        ) : null}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Player 1
          </p>
          <select
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            className={inputCls}
          >
            <option value={meId}>Eu</option>
            {ranking.players
              .filter((p) => p.userId !== meId)
              .map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.fullName}
                </option>
              ))}
          </select>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Player 2
          </p>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className={inputCls}
          >
            <option value="">— escolha —</option>
            {eligibleForP2.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.fullName}
                {p.userId === meId ? ' (eu)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Vencedor
          </p>
          <div className="space-y-1.5">
            <WinnerOption
              checked={winnerId === player1Id && !!player1Id}
              onSelect={() => setWinnerId(player1Id)}
              name={
                player1Id === meId
                  ? 'Eu'
                  : (ranking.players.find((p) => p.userId === player1Id)?.fullName ?? '—')
              }
              disabled={!player1Id}
            />
            <WinnerOption
              checked={winnerId === player2Id && !!player2Id}
              onSelect={() => setWinnerId(player2Id)}
              name={
                player2Id
                  ? (ranking.players.find((p) => p.userId === player2Id)?.fullName ?? '—')
                  : '—'
              }
              disabled={!player2Id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Quando
            </p>
            <input
              type="datetime-local"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className={inputCls}
            />
          </div>
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
          Após reportar, o oponente precisa confirmar pra rating ser recalculado e ranking
          atualizado.
        </p>

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
              <Plus className="size-3.5" />
            )}
            Reportar
          </button>
        </div>
      </div>
    </div>
  );
}

function WinnerOption({
  checked,
  onSelect,
  name,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors disabled:opacity-50',
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

function formatNowLocal(): string {
  // <input type="datetime-local"> espera "YYYY-MM-DDTHH:mm" sem timezone.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2.25 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function PlayerTable({ players, orderBy }: { players: RankingPlayerEntry[]; orderBy: string }) {
  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-display text-sm font-bold">Sem jogadores ainda</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Players são enrolados no ranking quando comissão aprova ou via primeira partida.
        </p>
      </div>
    );
  }

  const showPoints = orderBy === 'tournament_points' || orderBy === 'combined';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-[0.04em] text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Jogador</th>
            <th className="w-16 px-3 py-2 text-right font-semibold">Rating</th>
            {showPoints ? (
              <th className="hidden w-16 px-3 py-2 text-right font-semibold sm:table-cell">
                Pontos
              </th>
            ) : null}
            <th className="hidden w-20 px-3 py-2 text-right font-semibold sm:table-cell">V/D</th>
            <th className="w-12 px-3 py-2 text-right font-semibold">Δ</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.userId} className="border-t border-border first:border-t-0">
              <td className="px-3 py-2.5 font-display text-sm font-bold tabular-nums">
                {p.position}
              </td>
              <td className="truncate px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="size-7 rounded-full bg-muted object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
                      {p.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="truncate">{p.fullName}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{p.rating}</td>
              {showPoints ? (
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">
                  {p.tournamentPoints}
                </td>
              ) : null}
              <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                {p.wins}/{p.losses}
              </td>
              <td className="px-3 py-2.5 text-right">
                <RatingDelta delta={p.lastRatingChange} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatingDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <Minus className="ml-auto inline size-3 text-muted-foreground" />;
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
        positive ? 'text-success' : 'text-destructive',
      )}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? '+' : ''}
      {delta}
    </span>
  );
}
