'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, MapPin, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  KlubAccessMode,
  KlubDiscoveryResult,
  MeResponse,
  SportCatalog,
} from '@draftklub/shared-types';
import { discoverKlubs, joinKlubBySlug } from '@/lib/api/klubs';
import { requestMembership } from '@/lib/api/membership-requests';
import { listSports } from '@/lib/api/sports';
import { getMe } from '@/lib/api/me';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import { rememberLastKlubSlug } from '@/lib/last-klub-cookie';
import { Banner } from '@/components/ui/banner';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

/**
 * Discovery de Klubs (Sprint B). Substitui placeholder da Onda 1.5
 * PR5. Filtros: nome (debounce 300ms), UF, esporte. Sort tier-based
 * vem do backend. CTA depende do `accessMode`:
 * - public: "Entrar como Jogador" via existing /klubs/slug/:slug/join
 * - private: "Solicitar entrada" disabled (Sprint C ativa)
 *
 * AuthGuard vem do `(authed)/layout.tsx`. Sidebar persistente também.
 */
export default function BuscarKlubsPage() {
  const router = useRouter();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [sports, setSports] = React.useState<SportCatalog[]>([]);

  // Filtros
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const [state, setState] = React.useState('');
  const [sport, setSport] = React.useState('');

  // Geo (Sprint B+1)
  const [useGeo, setUseGeo] = React.useState(false);
  const [geoCoords, setGeoCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = React.useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'fallback' | 'unavailable'
  >('idle');
  const [radiusKm, setRadiusKm] = React.useState(25);

  // Período (Sprint B+3)
  const [period, setPeriod] = React.useState<'morning' | 'afternoon' | 'evening' | null>(null);

  // Resultados
  const [results, setResults] = React.useState<KlubDiscoveryResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  // Boot: carrega catálogo de sports + me (pra UI mostrar tier badges futuramente).
  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([listSports().catch(() => []), getMe().catch(() => null)]).then(
      ([sportsList, meRes]) => {
        if (cancelled) return;
        setSports(sportsList);
        setMe(meRes);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce do search box
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Browser geolocation request quando user toggla "Próximos a mim".
  // Estratégia: tenta browser geo; se denied/unavailable, usa lat/lng
  // do user (geocodado via CEP no /perfil) como fallback.
  React.useEffect(() => {
    if (!useGeo) {
      setGeoCoords(null);
      setGeoStatus('idle');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // Sem API → fallback direto
      if (typeof me?.latitude === 'number' && typeof me?.longitude === 'number') {
        setGeoCoords({ lat: me.latitude, lng: me.longitude });
        setGeoStatus('fallback');
      } else {
        setGeoStatus('unavailable');
      }
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      () => {
        if (typeof me?.latitude === 'number' && typeof me?.longitude === 'number') {
          setGeoCoords({ lat: me.latitude, lng: me.longitude });
          setGeoStatus('fallback');
        } else {
          setGeoStatus('denied');
        }
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, [useGeo, me?.latitude, me?.longitude]);

  // Fetch quando algum filtro muda (com debounce no q)
  const hasAnyFilter =
    debouncedQ.length >= 2 ||
    state.length > 0 ||
    sport.length > 0 ||
    (useGeo && !!geoCoords) ||
    period !== null;

  React.useEffect(() => {
    if (!hasAnyFilter) {
      setResults(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    discoverKlubs({
      q: debouncedQ.length >= 2 ? debouncedQ : undefined,
      state: state || undefined,
      sport: sport || undefined,
      lat: useGeo && geoCoords ? geoCoords.lat : undefined,
      lng: useGeo && geoCoords ? geoCoords.lng : undefined,
      radiusKm: useGeo && geoCoords ? radiusKm : undefined,
      period: period ?? undefined,
    })
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao buscar Klubs');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, state, sport, hasAnyFilter, reloadToken, useGeo, geoCoords, radiusKm, period]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          back={{ href: '/home', label: 'Voltar pra Home' }}
          title="Buscar Klubs"
          description="Encontre clubes pra entrar como sócio. Resultados ordenados pela sua localização."
          className="mb-8"
        />

        {/* Filtros */}
        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome do Klub (mín 2 letras)"
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </div>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="">Modalidade</option>
            {sports.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Geolocation toggle + radius slider */}
        <div className="mb-8 flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4 sm:flex-row sm:items-center sm:gap-5">
          <button
            type="button"
            onClick={() => setUseGeo((v) => !v)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors',
              useGeo
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border bg-background hover:bg-muted',
            )}
          >
            {geoStatus === 'requesting' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MapPin className="size-3.5" />
            )}
            Próximos a mim
          </button>

          {useGeo ? (
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="radius" className="text-xs font-medium text-muted-foreground">
                  Raio
                </label>
                <span className="text-xs font-semibold tabular-nums">{radiusKm} km</span>
              </div>
              <input
                id="radius"
                type="range"
                min={5}
                max={100}
                step={5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <GeoStatusHint status={geoStatus} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use sua localização pra ver os Klubs mais próximos por distância.
            </p>
          )}
        </div>

        {/* Período (Sprint B+3) */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Quando vai jogar?
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'morning', label: 'Manhã', hint: '6h–12h' },
                { id: 'afternoon', label: 'Tarde', hint: '12h–18h' },
                { id: 'evening', label: 'Noite', hint: '18h–23h' },
              ] as const
            ).map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(active ? null : p.id)}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                >
                  <span>{p.label}</span>
                  <span className={cn('text-xs', active ? 'opacity-90' : 'text-muted-foreground')}>
                    {p.hint}
                  </span>
                </button>
              );
            })}
          </div>
          {period ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Mostra Klubs com quadras operando nesse período. Pode estar lotado — confira ao clicar
              em &quot;Reservar&quot;.
            </p>
          ) : null}
        </div>

        {/* Conteúdo */}
        {error ? (
          <ErrorState message={error} onRetry={() => setReloadToken((n) => n + 1)} />
        ) : !hasAnyFilter ? (
          <InitialEmptyState />
        ) : results === null ? (
          <SkeletonGrid />
        ) : results.length === 0 ? (
          <NoResultsState />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((klub) => (
              <li key={klub.id}>
                <KlubCard
                  klub={klub}
                  userCity={me?.city ?? null}
                  userState={me?.state ?? null}
                  onJoined={() => {
                    rememberLastKlubSlug(klub.slug);
                    router.push(`/k/${klub.slug}/dashboard`);
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Não encontrou seu clube?{' '}
          <Link
            href="/criar-klub"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Crie o seu
          </Link>{' '}
          ou{' '}
          <Link
            href="/quero-criar-klub"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            avise sua administração
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function KlubCard({
  klub,
  userCity,
  userState,
  onJoined,
}: {
  klub: KlubDiscoveryResult;
  userCity: string | null;
  userState: string | null;
  onJoined: () => void;
}) {
  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);
  const [requestSubmitted, setRequestSubmitted] = React.useState(false);

  async function handleJoin() {
    if (klub.accessMode !== 'public' || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinKlubBySlug(klub.slug);
      onJoined();
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Erro ao entrar no Klub.');
      setJoining(false);
    }
  }

  const tier =
    userCity && klub.city && userCity === klub.city
      ? 'same-city'
      : userState && klub.state && userState === klub.state
        ? 'same-state'
        : 'far';

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <KlubAvatar name={klub.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold leading-tight tracking-tight">
            {klub.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {klub.city ?? '—'}
            {klub.state ? ` · ${klub.state}` : ''}
            {typeof klub.distanceKm === 'number' ? (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[hsl(var(--brand-primary-600))]">
                <MapPin className="size-3" />
                {formatDistance(klub.distanceKm)}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tier !== 'far' ? <TierBadge tier={tier} /> : null}
        <AccessBadge accessMode={klub.accessMode} />
        {klub.sports.slice(0, 3).map((code) => (
          <SportChip key={code} code={code} />
        ))}
        {klub.sports.length > 3 ? (
          <span className="text-xs text-muted-foreground">+{klub.sports.length - 3}</span>
        ) : null}
      </div>

      {joinError ? <p className="mt-3 text-xs text-destructive">{joinError}</p> : null}

      <div className="mt-auto pt-4">
        {klub.accessMode === 'public' ? (
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {joining ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                Entrar como Jogador
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        ) : requestSubmitted ? (
          <div className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 text-xs font-medium text-amber-700 dark:text-amber-400">
            Solicitação enviada
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Solicitar entrada
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>

      {requestModalOpen ? (
        <RequestMembershipModal
          klubName={klub.name}
          klubSlug={klub.slug}
          onClose={() => setRequestModalOpen(false)}
          onSubmitted={() => {
            setRequestSubmitted(true);
            setRequestModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function RequestMembershipModal({
  klubName,
  klubSlug,
  onClose,
  onSubmitted,
}: {
  klubName: string;
  klubSlug: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestMembership(klubSlug, { message: message.trim() });
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar solicitação.');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Solicitar entrada em ${klubName}`}
      description="O admin do Klub vai revisar. Inclua sua matrícula, indicação ou outra informação que ajude a identificar você."
      open={true}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={message.trim().length < 10 || submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Enviar solicitação
          </button>
        </>
      }
    >
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ex: Sou sócio nº 12345 — fui indicado pelo João da Silva."
        rows={4}
        maxLength={1000}
        className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
      />
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {message.trim().length}/1000 (mín 10)
      </p>
      {error ? <Banner tone="error">{error}</Banner> : null}
    </Modal>
  );
}

function GeoStatusHint({
  status,
}: {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'fallback' | 'unavailable';
}) {
  if (status === 'requesting') {
    return <p className="text-xs text-muted-foreground">Pedindo permissão de localização…</p>;
  }
  if (status === 'granted') {
    return <p className="text-xs text-muted-foreground">Usando sua localização atual.</p>;
  }
  if (status === 'fallback') {
    return (
      <p className="text-xs text-muted-foreground">
        Localização do navegador negada — usando o CEP do seu perfil.
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p className="text-xs text-destructive">
        Localização negada e sem CEP no perfil.{' '}
        <Link href="/perfil" className="underline">
          Cadastre seu CEP
        </Link>{' '}
        pra usar este filtro.
      </p>
    );
  }
  if (status === 'unavailable') {
    return (
      <p className="text-xs text-destructive">
        Seu navegador não suporta localização. Cadastre seu CEP no perfil.
      </p>
    );
  }
  return null;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function KlubAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'K';
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display text-base font-bold text-white"
      style={{ background: `hsl(${hue} 55% 42%)` }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function TierBadge({ tier }: { tier: 'same-city' | 'same-state' }) {
  const label = tier === 'same-city' ? 'Na sua cidade' : 'No seu estado';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        tier === 'same-city'
          ? 'bg-primary/10 text-[hsl(var(--brand-primary-600))]'
          : 'bg-muted text-foreground',
      )}
    >
      {label}
    </span>
  );
}

function AccessBadge({ accessMode }: { accessMode: KlubAccessMode }) {
  const isPublic = accessMode === 'public';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        isPublic ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      {isPublic ? 'Aberto' : 'Privado'}
    </span>
  );
}

function SportChip({ code }: { code: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
      {code}
    </span>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </ul>
  );
}

function InitialEmptyState() {
  return (
    <EmptyState
      icon={Search}
      title="Comece a buscar"
      description="Digite o nome de um Klub (mín 2 letras) ou use os filtros pra ver resultados."
    />
  );
}

function NoResultsState() {
  return (
    <EmptyState
      icon={Search}
      title="Nenhum Klub encontrado"
      description="Tenta outros filtros — talvez o nome esteja escrito diferente, ou o Klub ainda não optou por aparecer em busca."
      action={
        <Link
          href="/criar-klub"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Criar meu Klub
        </Link>
      }
    />
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <h2 className="font-display text-base font-bold text-destructive">Erro ao buscar</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Loader2 className="size-3.5" />
        Tentar de novo
      </button>
    </div>
  );
}
