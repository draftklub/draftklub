'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  ListOrdered,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import type { RankingListItem } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { getMe } from '@/lib/api/me';
import { createRanking, listKlubRankings, type CreateRankingInput } from '@/lib/api/rankings';
import { isPlatformLevel } from '@/lib/auth/role-helpers';
import { cn } from '@/lib/utils';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

const RANKING_TYPE_LABELS: Record<string, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  mixed: 'Mixed',
};

const ENGINE_LABELS: Record<string, string> = {
  elo: 'Elo',
  win_loss: 'Win/Loss',
  points: 'Pontos',
};

export default function SportRankingsPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [rankings, setRankings] = React.useState<RankingListItem[] | null>(null);
  const [canCreate, setCanCreate] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!klub) return;
    let cancelled = false;
    setError(null);
    void getMe()
      .then((me) => {
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
      })
      .catch(() => null);
    listKlubRankings(klub.id, sportCode)
      .then((rows) => {
        if (!cancelled) setRankings(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar rankings.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [klub, sportCode, reload]);

  if (!klub) return null;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          back={{ href: `/k/${klub.slug}/sports/${sportCode}/dashboard`, label: sportLabel }}
          eyebrow={`${klub.commonName ?? klub.name} · ${sportLabel}`}
          title="Rankings"
          description="Rankings ativos dessa modalidade. Cada um pode ter elegibilidade própria (gênero, faixa etária) e engine de rating distinta."
          action={
            canCreate ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-3.5" />
                Criar
              </button>
            ) : null
          }
        />

        {actionMessage ? (
          <Banner tone="success">{actionMessage}</Banner>
        ) : null}

        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : rankings === null ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <ListOrdered className="size-4" />
            </div>
            <p className="mt-3 font-display text-sm font-bold">Nenhum ranking ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              A comissão dessa modalidade pode criar rankings (em breve via UI).
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rankings.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/k/${klub.slug}/sports/${sportCode}/rankings/${r.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-base font-bold">{r.name}</h2>
                      <span className="inline-flex h-5 items-center rounded-full bg-primary/15 px-2 text-xs font-bold uppercase tracking-[0.06em] text-[hsl(var(--brand-primary-600))]">
                        {RANKING_TYPE_LABELS[r.type] ?? r.type}
                      </span>
                      <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {ENGINE_LABELS[r.ratingEngine] ?? r.ratingEngine}
                      </span>
                    </div>
                    <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" />
                        {r.playerCount} {r.playerCount === 1 ? 'jogador' : 'jogadores'}
                      </span>
                      {r.gender ? <span>· {r.gender}</span> : null}
                      {r.ageMin || r.ageMax ? (
                        <span>
                          · {r.ageMin ?? 0}–{r.ageMax ?? '∞'} anos
                        </span>
                      ) : null}
                      <span>· rating inicial {r.initialRating}</span>
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <CreateRankingModal
          klubId={klub.id}
          sportCode={sportCode}
          onClose={() => setCreateOpen(false)}
          onCreated={(name) => {
            setCreateOpen(false);
            setActionMessage(`Ranking "${name}" criado.`);
            setReload((n) => n + 1);
          }}
        />
      ) : null}
    </main>
  );
}

function CreateRankingModal({
  klubId,
  sportCode,
  onClose,
  onCreated,
}: {
  klubId: string;
  sportCode: string;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<'singles' | 'doubles' | 'mixed'>('singles');
  const [gender, setGender] = React.useState<'' | 'M' | 'F'>('');
  const [ageMin, setAgeMin] = React.useState('');
  const [ageMax, setAgeMax] = React.useState('');
  const [ratingEngine, setRatingEngine] = React.useState<'elo' | 'points' | 'win_loss'>('elo');
  const [initialRating, setInitialRating] = React.useState('1000');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    if (name.trim().length < 2) {
      setError('Nome precisa ter pelo menos 2 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const input: CreateRankingInput = {
        name: name.trim(),
        type,
        gender: gender || null,
        ratingEngine,
      };
      if (ageMin) input.ageMin = Number(ageMin);
      if (ageMax) input.ageMax = Number(ageMax);
      if (initialRating) input.initialRating = Number(initialRating);
      await createRanking(klubId, sportCode, input);
      onCreated(name.trim());
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao criar ranking.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-xl border border-border bg-card p-5 sm:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Criar ranking</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : null}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Nome
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Ex: Aberto Masculino A"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Tipo
            </p>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'singles' | 'doubles' | 'mixed')}
              className={inputCls}
            >
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Gênero
            </p>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as '' | 'M' | 'F')}
              className={inputCls}
            >
              <option value="">Aberto</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Idade mín
            </p>
            <input
              type="number"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              placeholder="—"
              min={0}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Idade máx
            </p>
            <input
              type="number"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              placeholder="—"
              min={0}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Rating engine
            </p>
            <select
              value={ratingEngine}
              onChange={(e) => setRatingEngine(e.target.value as 'elo' | 'points' | 'win_loss')}
              className={inputCls}
            >
              <option value="elo">Elo</option>
              <option value="win_loss">Win/Loss</option>
              <option value="points">Pontos</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Rating inicial
            </p>
            <input
              type="number"
              value={initialRating}
              onChange={(e) => setInitialRating(e.target.value)}
              min={0}
              max={9999}
              className={inputCls}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Após criar, players podem se enrolar via /rankings/:id e reportar partidas casuais. Edição
          de config (orderBy, window) ainda fica em SQL/admin (PR futuro).
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
            className={cn(
              'inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60',
            )}
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Criar ranking
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2.25 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';
