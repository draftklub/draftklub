'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

/**
 * Sprint D PR1 — sucesso pós-/criar-klub. Klub fica pendente; user
 * recebe email da decisão (PR3 ativa o trigger). Tom polite, sem
 * promessas de prazo cravadas.
 */
export default function CriarKlubSucessoPage() {
  return (
    <React.Suspense fallback={null}>
      <Inner />
    </React.Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const name = params.get('name') ?? 'seu Klub';

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-[hsl(142_71%_32%)]">
          <CheckCircle2 className="size-7" strokeWidth={1.8} />
        </div>

        <h1
          className="mt-6 font-display text-[26px] font-bold md:text-[30px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Recebemos sua solicitação!
        </h1>

        <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
          A solicitação de cadastro do <strong className="text-foreground">{name}</strong> foi
          enviada pra análise da nossa equipe. A gente confere os dados (Receita Federal, endereço,
          modalidades) e te avisa por email assim que liberar — costuma rolar em até{' '}
          <strong className="text-foreground">2 dias úteis</strong>.
        </p>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Se faltar alguma coisa, a gente também avisa por lá.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground">
          <Mail className="size-3.5" />
          Resposta vai por email cadastrado
        </div>

        <Link
          href="/home"
          className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Voltar pro início
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </main>
  );
}
