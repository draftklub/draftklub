'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loginWithGoogle, signupWithEmail } from '@/lib/auth';

type Status = 'idle' | 'loading' | 'error' | 'success';

interface SignupFormProps {
  formWidth?: number | string;
}

/**
 * Form de signup com email + senha. Espelha o LoginForm em estilo.
 *
 * Validação client-side casa com a policy do Firebase Auth (server):
 *  - nome: min 2 chars
 *  - email: regex básica
 *  - senha: min 8 chars + ≥1 numero
 *  - confirmar: igual à senha
 *
 * Após signup, redirect pra /home (shell autenticado com sidebar
 * persistente; user 0-memberships vê empty state com atalhos pra
 * buscar/criar Klub).
 */
export function SignupForm({ formWidth = 320 }: SignupFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [confirm, setConfirm] = React.useState('');
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

  function validate(): string | null {
    if (name.trim().length < 2) return 'Informe seu nome (mínimo 2 caracteres).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.';
    if (password.length < 8) return 'Senha precisa ter ao menos 8 caracteres.';
    if (!/\d/.test(password)) return 'Senha precisa ter ao menos 1 número.';
    if (confirm !== password) return 'A confirmação não bate com a senha.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || isSuccess) return;

    const localError = validate();
    if (localError) {
      setStatus('error');
      setErrorMsg(localError);
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      await signupWithEmail(email, password, name);
      setStatus('success');
      // Pequena pausa pro user ver a confirmação antes do redirect.
      setTimeout(() => router.push('/home'), 700);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar conta. Tente de novo.');
    }
  }

  async function handleGoogle() {
    if (isLoading || googleLoading) return;
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      setStatus('success');
      setTimeout(() => router.push('/home'), 700);
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
          Conta criada!
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="dk-spin size-3.5" />
          Bora encontrar seu Klub…
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
      {/* Nome */}
      <div>
        <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium">
          Nome
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearErrorOnChange();
          }}
          placeholder="Seu nome"
          autoComplete="name"
          disabled={isLoading}
          className={inputCls(isError)}
        />
      </div>

      {/* E-mail */}
      <div>
        <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium">
          E-mail
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearErrorOnChange();
          }}
          placeholder="seu@email.com"
          autoComplete="email"
          disabled={isLoading}
          className={inputCls(isError)}
        />
      </div>

      {/* Senha */}
      <div>
        <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearErrorOnChange();
            }}
            autoComplete="new-password"
            disabled={isLoading}
            className={cn(inputCls(isError), 'pr-11')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Mínimo 8 caracteres com pelo menos 1 número.
        </p>
      </div>

      {/* Confirmar */}
      <div>
        <label htmlFor="signup-confirm" className="mb-1.5 block text-sm font-medium">
          Confirme a senha
        </label>
        <input
          id="signup-confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            clearErrorOnChange();
          }}
          autoComplete="new-password"
          disabled={isLoading}
          className={inputCls(isError)}
        />
        {isError && errorMsg ? (
          <div
            role="alert"
            className="dk-shake mt-2 flex items-start gap-1.5 text-sm leading-tight text-destructive"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}
      </div>

      {/* Criar conta */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'mt-1 inline-flex h-11.5 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors',
          'hover:bg-primary/90 active:translate-y-px',
          'focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-95',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="dk-spin size-4" />
            Criando…
          </>
        ) : (
          'Criar conta'
        )}
      </button>

      {/* Divisor */}
      <div className="my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
          'inline-flex h-11.5 items-center justify-center gap-2.5 rounded-md border border-border bg-card text-sm font-medium text-foreground transition-colors',
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

      {/* Já tem conta? */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}

function inputCls(isError: boolean) {
  return cn(
    'h-11 w-full rounded-md border border-input bg-card px-3.5 text-sm text-foreground transition-colors outline-none',
    'placeholder:text-muted-foreground',
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    isError && 'border-destructive ring-[3px] ring-destructive/20',
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
