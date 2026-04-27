'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { sendPasswordReset } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

/**
 * Tela de "Esqueci minha senha". Manda email de reset via Firebase
 * Auth e mostra confirmação genérica — NÃO confirma se o e-mail está
 * cadastrado (boa prática: não vazar enumeração de contas).
 */
export default function RecuperarSenhaPage() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      await sendPasswordReset(email);
      setStatus('sent');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar. Tente de novo.');
    }
  }

  if (status === 'sent') {
    return <SentScreen />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar pro login
          </Link>
          <BrandLockup size="sm" />
        </div>

        <h1
          className="font-display text-[28px] font-bold md:text-[32px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Esqueceu a senha?
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Informa o seu e-mail. Se ele estiver cadastrado, a gente manda um link pra você criar uma
          nova senha.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-8 flex flex-col gap-4"
          noValidate
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') {
                  setStatus('idle');
                  setErrorMsg('');
                }
              }}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className={cn(
                'h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none transition-colors',
                'placeholder:text-muted-foreground',
                'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
                status === 'error' && 'border-destructive ring-[3px] ring-destructive/20',
              )}
            />
          </div>

          {status === 'error' && errorMsg ? (
            <p className="text-[13px] text-destructive" role="alert">
              {errorMsg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Enviar link'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function SentScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-8" strokeWidth={2.5} />
        </div>
        <h1
          className="mt-6 font-display text-[28px] font-bold"
          style={{ letterSpacing: '-0.02em' }}
        >
          Confere sua caixa de entrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Se esse e-mail estiver cadastrado, você vai receber o link em alguns minutos. Não esquece
          de olhar a pasta de spam.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Voltar pro login
        </Link>
      </div>
    </main>
  );
}
