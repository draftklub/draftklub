'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search } from 'lucide-react';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { useAuth } from '@/components/auth-provider';
import { EmailVerifyBanner } from '@/components/email-verify-banner';
import { getMyKlubs } from '@/lib/api/me';
import { readLastKlubSlug } from '@/lib/last-klub-cookie';

/**
 * Home — landing autenticada. Conteúdo cross-Klub (feed unificado,
 * próximas partidas, ranking pessoal) chega na Onda 3. Por enquanto,
 * shell minimalista: saudação + atalho pro último Klub visitado +
 * cards CTAs principais.
 */
export default function HomePage() {
  const { user } = useAuth();
  const [klubs, setKlubs] = React.useState<UserKlubMembership[] | null>(null);
  const [lastKlub, setLastKlub] = React.useState<UserKlubMembership | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getMyKlubs()
      .then((data) => {
        if (cancelled) return;
        setKlubs(data);
        const lastSlug = readLastKlubSlug();
        const last = lastSlug
          ? (data.find((k) => k.klubSlug === lastSlug && k.reviewStatus === 'approved') ?? null)
          : null;
        setLastKlub(last);
      })
      .catch(() => {
        if (!cancelled) setKlubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0] ?? '';
  const hasKlubs = klubs !== null && klubs.length > 0;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <EmailVerifyBanner />
        <header className="mb-10">
          <h1
            className="font-display text-[28px] font-bold md:text-[34px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Olá{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {hasKlubs
              ? 'Continue de onde parou ou troque de Klub na barra lateral.'
              : klubs === null
                ? 'Carregando seus Klubs…'
                : 'Você ainda não está em nenhum Klub. Use a barra lateral pra encontrar ou criar um.'}
          </p>
        </header>

        {/* Continue de onde parou */}
        {lastKlub ? (
          <section className="mb-8">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Continue de onde parou
            </h2>
            <Link
              href={`/k/${lastKlub.klubSlug}/dashboard`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-4">
                <KlubAvatar name={lastKlub.klubName} />
                <div className="min-w-0">
                  <h3
                    className="truncate font-display text-[18px] font-bold leading-tight"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {lastKlub.klubName}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
                    /k/{lastKlub.klubSlug}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          </section>
        ) : null}

        {/* Outros Klubs */}
        {hasKlubs && klubs && klubs.length > (lastKlub ? 1 : 0) ? (
          <section className="mb-8">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Seus outros Klubs
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {klubs
                .filter((k) => k.klubSlug !== lastKlub?.klubSlug)
                .map((k) => (
                  <li key={k.klubId}>
                    <KlubCard klub={k} />
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {/* Atalhos */}
        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Atalhos
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ShortcutCard
              href="/buscar-klubs"
              icon={Search}
              title="Buscar um Klub"
              body="Encontre clubes pra entrar como sócio."
            />
            <ShortcutCard
              href="/criar-klub"
              icon={Plus}
              title="Criar meu Klub"
              body="Self-service: você vira Klub Admin."
            />
          </div>
        </section>

        {/* Sales-led */}
        <p className="mt-10 text-center text-[12px] text-muted-foreground">
          <Link
            href="/quero-criar-klub"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Sou dono de um clube e quero saber mais
          </Link>
        </p>
      </div>
    </main>
  );
}

function KlubCard({ klub }: { klub: UserKlubMembership }) {
  const pending = klub.reviewStatus === 'pending';
  const rejected = klub.reviewStatus === 'rejected';
  const href = pending || rejected ? '/criar-klub/sucesso' : `/k/${klub.klubSlug}/dashboard`;
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <KlubAvatar name={klub.klubName} small />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold leading-tight">{klub.klubName}</h3>
          <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
            /{klub.klubSlug}
          </p>
        </div>
      </div>
      {pending ? (
        <span className="mt-2.5 inline-flex w-fit items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-400">
          Em análise
        </span>
      ) : rejected ? (
        <span className="mt-2.5 inline-flex w-fit items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-destructive">
          Rejeitado
        </span>
      ) : null}
    </Link>
  );
}

function KlubAvatar({ name, small }: { name: string; small?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'K';
  const hue = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={
        small
          ? 'flex size-8 shrink-0 items-center justify-center rounded-md font-display text-[12px] font-bold text-white'
          : 'flex size-12 shrink-0 items-center justify-center rounded-lg font-display text-base font-bold text-white'
      }
      style={{ background: `hsl(${hue} 55% 42%)` }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[hsl(var(--brand-primary-600))]">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[14.5px] font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{body}</p>
      </div>
      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
