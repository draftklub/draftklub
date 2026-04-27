'use client';

import * as React from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { UserInfo } from 'firebase/auth';
import type { Gender, MeResponse } from '@draftklub/shared-types';
import { useAuth } from '@/components/auth-provider';
import {
  changePassword,
  linkGoogleProvider,
  setPasswordOnAccount,
  unlinkProvider,
  updateDisplayName,
} from '@/lib/auth';
import { getMe, updateMe } from '@/lib/api/me';
import { BRAZILIAN_STATES, isBrazilianState } from '@/lib/brazilian-states';
import { cn } from '@/lib/utils';

export default function PerfilPage() {
  const { user } = useAuth();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setMe(null);
    getMe()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10">
          <h1
            className="font-display text-[28px] font-bold md:text-[34px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Perfil
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Suas informações de conta e métodos de login.
          </p>
        </header>

        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Loader2 className="size-3.5" />
              Tentar de novo
            </button>
          </div>
        ) : !me || !user ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-8">
            <IdentitySection initial={me} onUpdated={(next) => setMe(next)} />
            <AccessSection email={user.email ?? ''} providerData={user.providerData} />
            <DangerZone />
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Identidade ─────────────────────────────────────────────────────────

interface IdentitySectionProps {
  initial: MeResponse;
  onUpdated: (next: MeResponse) => void;
}

function IdentitySection({ initial, onUpdated }: IdentitySectionProps) {
  const [name, setName] = React.useState(initial.fullName);
  const [phone, setPhone] = React.useState(initial.phone ?? '');
  const [birthDate, setBirthDate] = React.useState(initial.birthDate ?? '');
  const [gender, setGender] = React.useState<Gender | ''>(initial.gender ?? '');
  const [city, setCity] = React.useState(initial.city ?? '');
  const [state, setState] = React.useState(initial.state ?? '');
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    setName(initial.fullName);
    setPhone(initial.phone ?? '');
    setBirthDate(initial.birthDate ?? '');
    setGender(initial.gender ?? '');
    setCity(initial.city ?? '');
    setState(initial.state ?? '');
  }, [initial]);

  const dirty =
    name.trim() !== initial.fullName.trim() ||
    phone !== (initial.phone ?? '') ||
    birthDate !== (initial.birthDate ?? '') ||
    gender !== (initial.gender ?? '') ||
    city !== (initial.city ?? '') ||
    state !== (initial.state ?? '');

  function clearStatusOnChange() {
    if (status === 'error' || status === 'saved') setStatus('idle');
  }

  function validate(): string | null {
    if (name.trim().length < 2) return 'Nome muito curto (mínimo 2 caracteres).';
    if (state.length > 0 && !isBrazilianState(state)) return 'UF inválida.';
    if (birthDate.length > 0) {
      const d = new Date(`${birthDate}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return 'Data de nascimento inválida.';
      if (d.getTime() > Date.now()) return 'Data de nascimento não pode ser no futuro.';
    }
    if (phone.length > 30) return 'Telefone muito longo.';
    return null;
  }

  async function handleSave() {
    if (!dirty || status === 'saving') return;
    const err = validate();
    if (err) {
      setStatus('error');
      setErrorMsg(err);
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    const nameChanged = name.trim() !== initial.fullName.trim();

    try {
      const promises: Promise<unknown>[] = [];
      if (nameChanged) promises.push(updateDisplayName(name));
      promises.push(
        updateMe({
          fullName: nameChanged ? name.trim() : undefined,
          phone: phone || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          city: city || undefined,
          state: state || undefined,
        }),
      );
      const results = await Promise.all(promises);
      // Última promise é sempre o updateMe e retorna MeResponse atualizado.
      const updated = results[results.length - 1] as MeResponse;
      onUpdated(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar.');
    }
  }

  return (
    <Section title="Identidade">
      <Field label="Nome">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearStatusOnChange();
          }}
          className={inputCls(status === 'error')}
        />
      </Field>

      <Field label="E-mail" hint="Gerenciado pelo provedor de login. Não dá pra editar aqui.">
        <input type="email" value={initial.email} disabled className={inputCls(false)} />
      </Field>

      <Field label="Telefone" hint="Opcional. Usamos pra contato em torneios e notificações.">
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            clearStatusOnChange();
          }}
          placeholder="(21) 9 9999-9999"
          autoComplete="tel"
          className={inputCls(false)}
        />
      </Field>

      <Field label="Data de nascimento" hint="Opcional. Usamos pra categorias de torneio.">
        <input
          type="date"
          value={birthDate}
          onChange={(e) => {
            setBirthDate(e.target.value);
            clearStatusOnChange();
          }}
          max={new Date().toISOString().slice(0, 10)}
          className={inputCls(false)}
        />
      </Field>

      <Field label="Gênero" hint="Opcional. Usamos pra categorias de torneio.">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'male' as const, label: 'Masculino' },
              { value: 'female' as const, label: 'Feminino' },
              { value: 'undisclosed' as const, label: 'Prefiro não dizer' },
            ] satisfies { value: Gender; label: string }[]
          ).map((opt) => {
            const isOn = gender === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setGender(opt.value);
                  clearStatusOnChange();
                }}
                className={cn(
                  'inline-flex h-9 items-center rounded-lg border px-3 text-[12.5px] font-medium transition-colors',
                  isOn
                    ? 'border-primary bg-primary/10 text-[hsl(var(--brand-primary-600))]'
                    : 'border-border bg-transparent text-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            );
          })}
          {gender ? (
            <button
              type="button"
              onClick={() => {
                setGender('');
                clearStatusOnChange();
              }}
              className="inline-flex h-9 items-center rounded-lg bg-transparent px-2 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar
            </button>
          ) : null}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade">
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearStatusOnChange();
            }}
            placeholder="Ex: Rio de Janeiro"
            className={inputCls(false)}
          />
        </Field>
        <Field label="UF">
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              clearStatusOnChange();
            }}
            className={cn(
              inputCls(status === 'error' && state.length > 0 && !isBrazilianState(state)),
              'pr-2',
            )}
          >
            <option value="">—</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FormFooter
        error={status === 'error' ? errorMsg : null}
        success={status === 'saved' ? 'Perfil atualizado.' : null}
      >
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || status === 'saving'}
          className={primaryBtnCls}
        >
          {status === 'saving' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando…
            </>
          ) : (
            'Salvar'
          )}
        </button>
      </FormFooter>
    </Section>
  );
}

// ─── Acesso (providers) ─────────────────────────────────────────────────

function AccessSection({
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
      <p className="-mt-2 mb-2 text-[12.5px] text-muted-foreground">
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
            <p className="text-[12px] text-muted-foreground">
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
        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-destructive" role="alert">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {errorMsg}
        </p>
      ) : null}
    </ProviderCard>
  );
}

// ─── Zona de risco ──────────────────────────────────────────────────────

function DangerZone() {
  return (
    <Section title="Zona de risco" tone="danger">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-[14px] font-semibold">Excluir conta</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Apaga sua conta no DraftKlub permanentemente. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          disabled
          title="Em breve — precisa de endpoint backend pra cleanup de dados (Memberships, RoleAssignments, etc.)"
          className="mt-3 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg bg-destructive px-3 text-[12.5px] font-semibold text-destructive-foreground opacity-50"
        >
          Excluir conta
          <span className="rounded bg-destructive-foreground/20 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em]">
            em breve
          </span>
        </button>
      </div>
    </Section>
  );
}

// ─── Primitives ─────────────────────────────────────────────────────────

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={cn(
          'mb-4 font-display text-[14px] font-bold uppercase tracking-[0.06em]',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FormFooter({
  children,
  error,
  success,
}: {
  children: React.ReactNode;
  error?: string | null;
  success?: string | null;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <div className="flex-1">
        {error ? (
          <p className="flex items-start gap-1.5 text-[12.5px] text-destructive" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="flex items-start gap-1.5 text-[12.5px] text-[hsl(142_71%_32%)]"
            role="status"
          >
            <Check className="mt-px size-3.5 shrink-0" />
            {success}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function ProviderCard({
  label,
  email,
  badge,
  badgeTone,
  children,
}: {
  label: string;
  email?: string;
  badge: string;
  badgeTone: 'success' | 'neutral';
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold">{label}</p>
          {email ? (
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[0.06em]',
            badgeTone === 'success'
              ? 'bg-primary/10 text-[hsl(var(--brand-primary-600))]'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  cn(
    'h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[14px] outline-none transition-colors',
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError && 'border-destructive ring-[3px] ring-destructive/20',
  );

const primaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';

const ghostBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-transparent px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';
