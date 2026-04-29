'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import { ApiError } from '@/lib/api/client';
import { useActiveKlub } from '@/components/active-klub-provider';
import { requestEnrollment } from '@/lib/api/enrollments';

const SPORT_LABELS: Record<string, string> = {
  tennis: 'Tênis',
  padel: 'Padel',
  squash: 'Squash',
  beach_tennis: 'Beach tennis',
};

/**
 * Sprint Polish PR-H3 — quando user clica numa modalidade do Klub mas
 * não está inscrito, cai aqui pra solicitar entrada. Comissão esportiva
 * do Klub aprova/rejeita via fluxo existente.
 */
export default function EnrollRequestPage() {
  const params = useParams<{ klubSlug: string; sportCode: string }>();
  const router = useRouter();
  const { klub } = useActiveKlub();
  const sportCode = params.sportCode;
  const sportLabel = SPORT_LABELS[sportCode] ?? sportCode;

  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (!klub || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestEnrollment(klub.id, sportCode);
      setSuccess(true);
      setTimeout(() => router.push(`/k/${klub.slug}/dashboard`), 2500);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao solicitar entrada.',
      );
      setSubmitting(false);
    }
  }

  if (!klub) return null;

  const klubLabel = klub.commonName ?? klub.name;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-md space-y-5">
        <PageHeader
          back={{ href: `/k/${klub.slug}/dashboard`, label: klubLabel }}
          eyebrow={klubLabel}
          title={`Solicitar entrada em ${sportLabel}`}
          description="A comissão esportiva da modalidade vai aprovar ou rejeitar."
        />

        {success ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success">
            <CheckCircle2 className="mr-1 inline size-4" />
            <span className="font-semibold">Solicitação enviada!</span> Você vai receber um aviso
            quando for aprovada. Voltando pro Klub…
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <UserCheck className="size-5 text-muted-foreground" />
            <p className="mt-2 text-sm">
              Confirme que quer entrar em <strong>{sportLabel}</strong> no{' '}
              <strong>{klubLabel}</strong>. Após aprovação você poderá participar de torneios e ver
              o ranking dessa modalidade.
            </p>

            {error ? <Banner tone="error">{error}</Banner> : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserCheck className="size-3.5" />
              )}
              Enviar solicitação
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
