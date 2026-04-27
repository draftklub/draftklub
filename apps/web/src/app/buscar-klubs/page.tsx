'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

/**
 * Placeholder pra discovery de Klubs públicos. Onda 1.5 não inclui
 * busca real — backend não tem endpoint nem flag `Klub.discoverable`
 * (ver plano Onda 1.5, seção out-of-scope). Onda 2 troca por listagem
 * de verdade com filtro nome/cidade.
 *
 * AuthGuard: só faz sentido pra user logado (chega aqui via
 * `/escolher-klub`).
 */
export default function BuscarKlubsPage() {
  return (
    <AuthGuard>
      <main className="flex min-h-screen items-start bg-background px-6 py-12 md:items-center md:py-16">
        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/escolher-klub"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>

          <div className="rounded-xl border border-border bg-card p-8 md:p-10">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-[hsl(var(--brand-primary-600))]">
              <Search className="size-6" strokeWidth={1.8} />
            </div>

            <h1
              className="mt-5 font-display text-[24px] font-bold md:text-[28px]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Buscar Klubs vai chegar
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">
              A gente está preparando a busca por Klubs públicos. Quando
              ficar pronto, a gente avisa.
            </p>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              Por enquanto, dois caminhos:
            </p>

            <ul className="mt-4 flex flex-col gap-2.5 text-[13.5px] text-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                <span>
                  Se você já é sócio de um clube,{' '}
                  <b className="font-semibold">peça um convite</b> pra
                  comissão técnica ou Klub Admin.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
                <span>
                  Se você é dono ou opera um clube,{' '}
                  <b className="font-semibold">crie o seu Klub</b> agora —
                  você vira Klub Admin automaticamente.
                </span>
              </li>
            </ul>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Link
                href="/criar-klub"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Criar meu Klub
              </Link>
              <Link
                href="/escolher-klub"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] border border-border bg-transparent px-5 text-[14.5px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                Voltar pra escolher Klub
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-muted-foreground">
            <Link
              href="/quero-criar-klub"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Sou dono de um clube e quero saber mais
            </Link>
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
