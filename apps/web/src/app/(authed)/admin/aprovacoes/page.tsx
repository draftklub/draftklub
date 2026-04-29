'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Search, Building2, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import type {
  AdminPendingKlubItem,
  AdminPendingKlubsPage,
  KlubReviewStatus,
} from '@draftklub/shared-types';
import { listPendingKlubs } from '@/lib/api/admin-klubs';
import { hintDocument } from '@/lib/format-document';
import { Banner } from '@/components/ui/banner';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type Tab = 'pj' | 'pf';

/**
 * Sprint D PR2 — área admin de cadastros pendentes. Tabs separam PJ × PF
 * (pedido explícito do user). Filtro por status (pending / approved /
 * rejected). Busca por nome.
 */
export default function CadastrosPage() {
  const [tab, setTab] = React.useState<Tab>('pj');
  const [status, setStatus] = React.useState<KlubReviewStatus>('pending');
  const [q, setQ] = React.useState('');
  const [debouncedQ, setDebouncedQ] = React.useState('');
  const [data, setData] = React.useState<AdminPendingKlubsPage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPendingKlubs({
      type: tab,
      status,
      q: debouncedQ.length >= 2 ? debouncedQ : undefined,
      limit: 50,
    })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, status, debouncedQ]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          back={{ href: '/home', label: 'Voltar pra Home' }}
          title="Cadastros de Klubs"
          description="Aprovação administrativa dos cadastros submetidos via /criar-klub."
          className="mb-8"
        />

        {/* Tabs PJ / PF */}
        <Tabs
          className="mb-4"
          tabs={[
            { id: 'pj', label: <><Building2 className="size-3.5" />PJ</> },
            { id: 'pf', label: <><UserIcon className="size-3.5" />PF</> },
          ]}
          active={tab}
          onChange={(id) => setTab(id as Tab)}
        />

        {/* Filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome do Klub"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as KlubReviewStatus)}
            className="h-10 rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Rejeitados</option>
          </select>
        </div>

        {error ? (
          <Banner tone="error">{error}</Banner>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-display text-base font-bold">
              Nenhum cadastro {labelStatus(status)}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando alguém criar um Klub {tab === 'pj' ? 'PJ' : 'PF'}, ele aparece aqui.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {data.total} {data.total === 1 ? 'cadastro' : 'cadastros'}
            </p>
            <ul className="space-y-3">
              {data.items.map((item) => (
                <li key={item.id}>
                  <CadastroCard item={item} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}


function CadastroCard({ item }: { item: AdminPendingKlubItem }) {
  const date = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      href={`/admin/aprovacoes/${item.id}`}
      className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display text-sm font-bold leading-tight">{item.name}</h3>
          <ReviewBadge status={item.reviewStatus} />
          {item.cnpjStatus ? <CnpjBadge status={item.cnpjStatus} /> : null}
        </div>
        {item.legalName ? (
          <p className="truncate text-xs text-muted-foreground">{item.legalName}</p>
        ) : null}
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-mono">
            {item.entityType === 'pj'
              ? hintDocument(item.documentHint ?? '', 'cnpj')
              : hintDocument(item.createdBy?.documentNumber ?? '', 'cpf')}
          </span>
          {item.city ? ` · ${item.city}` : ''}
          {item.state ? `/${item.state}` : ''}
          {' · '}
          {date}
        </p>
        {item.createdBy ? (
          <p className="truncate text-xs text-muted-foreground">
            Criado por {item.createdBy.fullName} · {item.createdBy.email}
          </p>
        ) : null}
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function ReviewBadge({ status }: { status: KlubReviewStatus }) {
  const tone =
    status === 'pending'
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      : status === 'approved'
        ? 'bg-success/12 text-success'
        : 'bg-destructive/10 text-destructive';
  const label =
    status === 'pending' ? 'Pendente' : status === 'approved' ? 'Aprovado' : 'Rejeitado';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      {label}
    </span>
  );
}

function CnpjBadge({ status }: { status: string }) {
  const tone =
    status === 'ativa'
      ? 'bg-success/12 text-success'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        tone,
      )}
    >
      CNPJ {status}
    </span>
  );
}

function labelStatus(s: KlubReviewStatus): string {
  return s === 'pending' ? 'pendente' : s === 'approved' ? 'aprovado' : 'rejeitado';
}
