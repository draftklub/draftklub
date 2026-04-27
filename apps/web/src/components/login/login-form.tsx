'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loginWithEmail, loginWithGoogle } from '@/lib/auth';

type Status = 'idle' | 'loading' | 'error' | 'success';

interface LoginFormProps {
  /** Largura do form em px ou string CSS. Default 320 (mobile). */
  formWidth?: number | string;
}

/**
 * Form core de login do DraftKlub.
 *
 * Estados: idle / loading / error (inline com shake) / success (check + spinner).
 * Tema: tokens shadcn — herda dark mode automaticamente.
 */
export function LoginForm({ formWidth = 320 }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isSuccess = status === 'success';

  function clearErrorOnChange() {
    if (isError) {
      setStatus('idle');
      setErrorMsg('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || isSuccess) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      await loginWithEmail(email, password);
      setStatus('success');
      // Pequena pausa pra usuário ver a confirmação antes do redirect.
      setTimeout(() => router.push('/post-login'), 700);
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'E-mail ou senha incorretos. Confira e tente de novo.',
      );
    }
  }

  async function handleGoogle() {
    if (isLoading || googleLoading) return;
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      setStatus('success');
      setTimeout(() => router.push('/post-login'), 700);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div
        className="dk-fade-in flex flex-col items-center gap-4 py-8"
        style={{ width: formWidth }}
      >
        <div
          className="dk-pop-in flex size-16 items-center justify-center rounded-full bg-primary"
          style={{ boxShadow: '0 8px 24px -8px hsl(var(--primary) / 0.6)' }}
        >
          <Check className="size-8 text-primary-foreground" strokeWidth={2.6} />
        </div>
        <div
          className="font-display text-xl font-semibold text-foreground"
          style={{ letterSpacing: '-0.01em' }}
        >
          Bem-vindo de volta.
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="dk-spin size-3.5" />
          Levando você ao Klub…
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3.5"
      style={{ width: formWidth }}
      noValidate
    >
      {/* E-mail */}
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[13px] font-medium text-foreground"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearErrorOnChange();
          }}
          placeholder="seu@email.com"
          autoComplete="email"
          disabled={isLoading}
          className={cn(
            'h-11 w-full rounded-[10px] border border-input bg-card px-3.5 text-[15px] text-foreground transition-colors outline-none',
            'placeholder:text-muted-foreground',
            'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            isError && 'border-destructive ring-[3px] ring-destructive/20',
          )}
        />
      </div>

      {/* Senha */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="text-[13px] font-medium text-foreground">
            Senha
          </label>
          <Link
            href="/recuperar-senha"
            tabIndex={-1}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearErrorOnChange();
            }}
            autoComplete="current-password"
            disabled={isLoading}
            className={cn(
              'h-11 w-full rounded-[10px] border border-input bg-card pl-3.5 pr-11 text-[15px] text-foreground transition-colors outline-none',
              'placeholder:text-muted-foreground',
              'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-60',
              isError && 'border-destructive ring-[3px] ring-destructive/20',
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-[18px]" />
            ) : (
              <Eye className="size-[18px]" />
            )}
          </button>
        </div>

        {isError && errorMsg ? (
          <div
            role="alert"
            className="dk-shake mt-2 flex items-start gap-1.5 text-[13px] leading-tight text-destructive"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}
      </div>

      {/* Entrar */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'mt-1 inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground transition-colors',
          'hover:bg-primary/90 active:translate-y-px',
          'focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-95',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="dk-spin size-4" />
            Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </button>

      {/* Divisor "ou" */}
      <div className="my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          ou
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={isLoading || googleLoading}
        className={cn(
          'inline-flex h-[46px] items-center justify-center gap-2.5 rounded-[10px] border border-border bg-card text-[15px] font-medium text-foreground transition-colors',
          'hover:bg-muted',
          'focus-visible:ring-[3px] focus-visible:ring-primary/20 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {googleLoading ? (
          <>
            <Loader2 className="dk-spin size-4 text-muted-foreground" />
            Conectando ao Google…
          </>
        ) : (
          <>
            <GoogleIcon size={18} />
            Continuar com Google
          </>
        )}
      </button>
    </form>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
