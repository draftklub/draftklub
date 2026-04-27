'use client';

import * as React from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { sendEmailVerify } from '@/lib/auth';

const COOLDOWN_KEY = 'dk_email_verify_sent_at';
const COOLDOWN_MS = 60_000;

/**
 * Banner sutil avisando user que o email não foi verificado ainda.
 * Renderiza null se `emailVerified === true` ou não há user logado.
 *
 * Botão "Reenviar email" tem cooldown de 60s pra evitar spam (Firebase
 * também rate-limita server-side, mas damos sinal visual antes).
 *
 * Cooldown persiste em localStorage pra sobreviver navegação entre
 * /home e /perfil sem cair em cooldown novamente.
 */
export function EmailVerifyBanner() {
  const { user } = useAuth();
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [secondsLeft, setSecondsLeft] = React.useState(0);

  // Calcula cooldown restante baseado no localStorage.
  React.useEffect(() => {
    function tick() {
      if (typeof window === 'undefined') return;
      const sentAtStr = window.localStorage.getItem(COOLDOWN_KEY);
      const sentAt = sentAtStr ? Number.parseInt(sentAtStr, 10) : 0;
      const remaining = Math.max(0, sentAt + COOLDOWN_MS - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining > 0 && status === 'idle') setStatus('sent');
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  if (!user) return null;
  if (user.emailVerified) return null;

  async function handleResend() {
    if (status === 'sending' || secondsLeft > 0) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await sendEmailVerify();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      }
      setStatus('sent');
      setSecondsLeft(60);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar.');
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[hsl(var(--brand-accent-500)/0.4)] bg-[hsl(var(--brand-accent-500)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--brand-accent-500)/0.18)] text-[hsl(38_92%_28%)]">
          <Mail className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-foreground">Verifique seu e-mail</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {status === 'sent'
              ? `Enviamos um link pra ${user.email}. Confere a caixa de entrada e o spam.`
              : `Enviamos um link de confirmação pra ${user.email}. Sem ele, alguns fluxos transacionais podem ficar bloqueados.`}
          </p>
          {status === 'error' ? (
            <p className="mt-1 text-[12px] text-destructive">{errorMsg}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={status === 'sending' || secondsLeft > 0}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Enviando…
          </>
        ) : secondsLeft > 0 ? (
          <>
            <Check className="size-3.5 text-primary" />
            Aguarde {secondsLeft}s
          </>
        ) : (
          'Reenviar e-mail'
        )}
      </button>
    </div>
  );
}
