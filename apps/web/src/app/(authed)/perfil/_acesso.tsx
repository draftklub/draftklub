'use client';

/**
 * Sprint O batch O-8 — AccessSection + PasswordRow + GoogleRow + DangerZone
 * extraídos de _components.tsx.
 */

import * as React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { UserInfo } from 'firebase/auth';
import {
  changePassword,
  linkGoogleProvider,
  setPasswordOnAccount,
  unlinkProvider,
} from '@/lib/auth';
import {
  Field,
  FormFooter,
  ProviderCard,
  Section,
  ghostBtnCls,
  inputCls,
  primaryBtnCls,
  secondaryBtnCls,
} from './_primitivos';

// ─── Acesso (providers) ─────────────────────────────────────────────────

export function AccessSection({
  email,
  providerData,
}: {
  email: string;
  providerData: readonly UserInfo[];
}) {
  const hasPassword = providerData.some((p) => p.providerId === 'password');
  const hasGoogle = providerData.some((p) => p.providerId === 'google.com');

  return (
    <Section title="Acesso">
      <p className="-mt-2 mb-2 text-xs text-muted-foreground">
        Métodos de login conectados à sua conta.
      </p>
      <PasswordRow email={email} hasPassword={hasPassword} canUnlink={hasGoogle} />
      <GoogleRow hasGoogle={hasGoogle} canUnlink={hasPassword} />
    </Section>
  );
}

function PasswordRow({
  email,
  hasPassword,
  canUnlink,
}: {
  email: string;
  hasPassword: boolean;
  canUnlink: boolean;
}) {
  const [mode, setMode] = React.useState<'idle' | 'set' | 'change'>('idle');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  function reset() {
    setMode('idle');
    setNewPassword('');
    setConfirm('');
    setCurrentPassword('');
    setStatus('idle');
    setErrorMsg('');
  }

  function validateNewPassword(): string | null {
    if (newPassword.length < 8) return 'Senha precisa ter ao menos 8 caracteres.';
    if (!/\d/.test(newPassword)) return 'Senha precisa ter ao menos 1 número.';
    if (confirm !== newPassword) return 'A confirmação não bate com a senha.';
    return null;
  }

  async function handleSet() {
    const err = validateNewPassword();
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      return;
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      await setPasswordOnAccount(newPassword);
      reset();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao definir senha.');
    }
  }

  async function handleChange() {
    const err = validateNewPassword();
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      return;
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      await changePassword(currentPassword, newPassword);
      reset();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao trocar senha.');
    }
  }

  async function handleUnlink() {
    if (!canUnlink) return;
    if (!confirm) {
      // No confirmação adicional aqui — Firebase pede reauth se necessário.
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      await unlinkProvider('password');
      reset();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao desconectar.');
    }
  }

  return (
    <ProviderCard
      label="E-mail e senha"
      email={hasPassword ? email : undefined}
      badge={hasPassword ? 'Conectado' : 'Não definida'}
      badgeTone={hasPassword ? 'success' : 'neutral'}
    >
      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode(hasPassword ? 'change' : 'set')}
            className={secondaryBtnCls}
          >
            {hasPassword ? 'Trocar senha' : 'Definir senha'}
          </button>
          {hasPassword && canUnlink ? (
            <button type="button" onClick={() => void handleUnlink()} className={ghostBtnCls}>
              Desconectar
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mode === 'change' ? (
            <Field label="Senha atual">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputCls(false)}
              />
            </Field>
          ) : null}
          <Field label="Nova senha" hint="Mínimo 8 caracteres com pelo menos 1 número.">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className={inputCls(status === 'error')}
            />
          </Field>
          <Field label="Confirme a nova senha">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputCls(status === 'error')}
            />
          </Field>
          <FormFooter error={status === 'error' ? errorMsg : null}>
            <button type="button" onClick={reset} className={ghostBtnCls}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void (mode === 'set' ? handleSet() : handleChange())}
              disabled={status === 'saving'}
              className={primaryBtnCls}
            >
              {status === 'saving' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando…
                </>
              ) : mode === 'set' ? (
                'Definir senha'
              ) : (
                'Trocar senha'
              )}
            </button>
          </FormFooter>
        </div>
      )}
    </ProviderCard>
  );
}

function GoogleRow({ hasGoogle, canUnlink }: { hasGoogle: boolean; canUnlink: boolean }) {
  const [status, setStatus] = React.useState<'idle' | 'working' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleLink() {
    setStatus('working');
    setErrorMsg('');
    try {
      await linkGoogleProvider();
      setStatus('idle');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao conectar Google.');
    }
  }

  async function handleUnlink() {
    if (!canUnlink) return;
    setStatus('working');
    setErrorMsg('');
    try {
      await unlinkProvider('google.com');
      setStatus('idle');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao desconectar Google.');
    }
  }

  return (
    <ProviderCard
      label="Google"
      badge={hasGoogle ? 'Conectado' : 'Não conectado'}
      badgeTone={hasGoogle ? 'success' : 'neutral'}
    >
      <div className="flex gap-2">
        {hasGoogle ? (
          canUnlink ? (
            <button
              type="button"
              onClick={() => void handleUnlink()}
              disabled={status === 'working'}
              className={ghostBtnCls}
            >
              {status === 'working' ? <Loader2 className="size-4 animate-spin" /> : 'Desconectar'}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pra desconectar Google, defina uma senha primeiro.
            </p>
          )
        ) : (
          <button
            type="button"
            onClick={() => void handleLink()}
            disabled={status === 'working'}
            className={secondaryBtnCls}
          >
            {status === 'working' ? <Loader2 className="size-4 animate-spin" /> : 'Conectar Google'}
          </button>
        )}
      </div>
      {status === 'error' ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {errorMsg}
        </p>
      ) : null}
    </ProviderCard>
  );
}

// ─── Zona de risco ──────────────────────────────────────────────────────

export function DangerZone() {
  return (
    <Section title="Zona de risco" tone="danger">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-semibold">Excluir conta</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Apaga sua conta no DraftKlub permanentemente. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          disabled
          title="Em breve — precisa de endpoint backend pra cleanup de dados (Memberships, RoleAssignments, etc.)"
          className="mt-3 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground opacity-50"
        >
          Excluir conta
          <span className="rounded bg-destructive-foreground/20 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em]">
            em breve
          </span>
        </button>
      </div>
    </Section>
  );
}
