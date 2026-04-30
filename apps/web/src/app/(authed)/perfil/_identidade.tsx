'use client';

/**
 * Sprint O batch O-8 — IdentitySection + AvatarRow extraídos de _components.tsx.
 */

import * as React from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import type { Gender, MeResponse } from '@draftklub/shared-types';
import { updateDisplayName } from '@/lib/auth';
import { updateMe } from '@/lib/api/me';
import { formatCpf } from '@/lib/viacep';
import { uploadProfilePhoto } from '@/lib/storage';
import { cn } from '@/lib/utils';
import {
  Field,
  FormFooter,
  Section,
  inputCls,
  primaryBtnCls,
  validateCpfChecksum,
} from './_primitivos';

// ─── Identidade ─────────────────────────────────────────────────────────

interface AvatarRowProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onUpdated: (next: MeResponse) => void;
}

function AvatarRow({ userId, avatarUrl, displayName, onUpdated }: AvatarRowProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadProfilePhoto(file, userId);
      // Cache-bust com query param: getDownloadURL pode retornar URL
      // estável e browsers cacheiam agressivamente.
      const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const updated = await updateMe({ avatarUrl: cacheBustedUrl });
      onUpdated(updated);
      // Sync displayName Firebase também — Firebase Auth user.photoURL
      // é separado do backend avatarUrl. Mantém em paralelo pra UIs
      // que leem do Firebase user direto (sidebar) sincronizem.
      const auth = (await import('@/lib/firebase')).getFirebaseAuth();
      const fbUser = auth.currentUser;
      if (fbUser) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(fbUser, { photoURL: cacheBustedUrl });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar foto.');
    } finally {
      setUploading(false);
    }
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  const hue = Array.from(displayName).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div className="flex items-center gap-4">
      <span
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-xl font-bold text-white"
        style={{ background: `hsl(${hue} 55% 42%)` }}
        aria-hidden="true"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            width={64}
            height={64}
            alt=""
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          initial
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Foto de perfil</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          JPEG, PNG ou WebP. Redimensionada pra 512px.
        </p>
        {errorMsg ? <p className="mt-1 text-xs text-destructive">{errorMsg}</p> : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Enviando…
          </>
        ) : avatarUrl ? (
          'Trocar foto'
        ) : (
          'Adicionar foto'
        )}
      </button>
    </div>
  );
}

interface IdentitySectionProps {
  initial: MeResponse;
  onUpdated: (next: MeResponse) => void;
}

export function IdentitySection({ initial, onUpdated }: IdentitySectionProps) {
  const [name, setName] = React.useState(initial.fullName);
  const [phone, setPhone] = React.useState(initial.phone ?? '');
  const [birthDate, setBirthDate] = React.useState(initial.birthDate ?? '');
  const [gender, setGender] = React.useState<Gender | ''>(initial.gender ?? '');
  const [cpfInput, setCpfInput] = React.useState(formatCpf(initial.documentNumber ?? ''));
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    setName(initial.fullName);
    setPhone(initial.phone ?? '');
    setBirthDate(initial.birthDate ?? '');
    setGender(initial.gender ?? '');
    setCpfInput(formatCpf(initial.documentNumber ?? ''));
  }, [initial]);

  const cpfDigits = cpfInput.replace(/\D/g, '');
  const dirty =
    name.trim() !== initial.fullName.trim() ||
    phone !== (initial.phone ?? '') ||
    birthDate !== (initial.birthDate ?? '') ||
    gender !== (initial.gender ?? '') ||
    cpfDigits !== (initial.documentNumber ?? '');

  function clearStatusOnChange() {
    if (status === 'error' || status === 'saved') setStatus('idle');
  }

  function validate(): string | null {
    if (name.trim().length < 2) return 'Nome muito curto (mínimo 2 caracteres).';
    if (phone.trim().length === 0) return 'Telefone é obrigatório.';
    if (phone.length > 30) return 'Telefone muito longo.';
    if (birthDate.length === 0) return 'Data de nascimento é obrigatória.';
    const d = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return 'Data de nascimento inválida.';
    if (d.getTime() > Date.now()) return 'Data de nascimento não pode ser no futuro.';
    if (gender === '') return 'Gênero é obrigatório.';
    if (cpfDigits.length === 0) return 'CPF é obrigatório.';
    if (cpfDigits.length !== 11) return 'CPF deve ter 11 dígitos.';
    if (!validateCpfChecksum(cpfDigits)) return 'CPF inválido. Confere os dígitos.';
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
          documentNumber: cpfDigits || undefined,
          documentType: cpfDigits ? 'cpf' : undefined,
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
      <AvatarRow
        userId={initial.id}
        avatarUrl={initial.avatarUrl}
        displayName={initial.fullName}
        onUpdated={onUpdated}
      />

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

      <Field label="E-mail">
        <input type="email" value={initial.email} disabled className={inputCls(false)} />
      </Field>

      <Field label="CPF">
        <input
          type="text"
          inputMode="numeric"
          value={cpfInput}
          onChange={(e) => {
            setCpfInput(formatCpf(e.target.value));
            clearStatusOnChange();
          }}
          placeholder="000.000.000-00"
          maxLength={14}
          autoComplete="off"
          className={inputCls(status === 'error')}
        />
      </Field>

      <Field label="Telefone">
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

      <Field label="Data de nascimento">
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

      <Field label="Gênero">
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
                  'inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors',
                  isOn
                    ? 'border-primary bg-primary/10 text-brand-primary-600'
                    : 'border-border bg-transparent text-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>

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
