'use client';

/**
 * Sprint L PR-L4 — coleção de section-components do /perfil.
 *
 * Migrado da page.tsx monolítica de 1361 linhas. Cada sub-rota
 * (page/pessoa-fisica/endereco/preferencias/notificacoes/acesso)
 * importa a section que precisa daqui. Refatoração pra primitivos
 * (Modal/Banner/etc) e tokens é PR-L5+.
 *
 * Exports:
 * - `IdentitySection` (com AvatarRow integrado)
 * - `PessoaFisicaSection`
 * - `EnderecoSection`
 * - `PreferenciasSection`
 * - `NotificacoesSection`
 * - `AccessSection`
 * - `DangerZone`
 */

import * as React from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { UserInfo } from 'firebase/auth';
import type { Gender, MeResponse, NotificationPrefs } from '@draftklub/shared-types';
import {
  changePassword,
  linkGoogleProvider,
  setPasswordOnAccount,
  unlinkProvider,
  updateDisplayName,
} from '@/lib/auth';
import { updateMe } from '@/lib/api/me';
import { BRAZILIAN_STATES, isBrazilianState } from '@/lib/brazilian-states';
import { formatCep, formatCpf, lookupCep } from '@/lib/viacep';
import { uploadProfilePhoto } from '@/lib/storage';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

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
          <img
            src={avatarUrl}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
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
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    setName(initial.fullName);
    setPhone(initial.phone ?? '');
    setBirthDate(initial.birthDate ?? '');
    setGender(initial.gender ?? '');
  }, [initial]);

  const dirty =
    name.trim() !== initial.fullName.trim() ||
    phone !== (initial.phone ?? '') ||
    birthDate !== (initial.birthDate ?? '') ||
    gender !== (initial.gender ?? '');

  function clearStatusOnChange() {
    if (status === 'error' || status === 'saved') setStatus('idle');
  }

  function validate(): string | null {
    if (name.trim().length < 2) return 'Nome muito curto (mínimo 2 caracteres).';
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
                  'inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors',
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
              className="inline-flex h-9 items-center rounded-lg bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar
            </button>
          ) : null}
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

// ─── Pessoa física ──────────────────────────────────────────────────────

interface PessoaFisicaSectionProps {
  initial: MeResponse;
  onUpdated: (next: MeResponse) => void;
}

export function PessoaFisicaSection({ initial, onUpdated }: PessoaFisicaSectionProps) {
  const [cpfInput, setCpfInput] = React.useState(formatCpf(initial.documentNumber ?? ''));
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    setCpfInput(formatCpf(initial.documentNumber ?? ''));
  }, [initial.documentNumber]);

  const cpfDigits = cpfInput.replace(/\D/g, '');
  const dirty = cpfDigits !== (initial.documentNumber ?? '');

  function clearStatusOnChange() {
    if (status === 'error' || status === 'saved') setStatus('idle');
  }

  async function handleSave() {
    if (!dirty || status === 'saving') return;
    if (cpfDigits.length === 0) {
      setStatus('error');
      setErrorMsg('Informe o CPF.');
      return;
    }
    if (cpfDigits.length !== 11) {
      setStatus('error');
      setErrorMsg('CPF deve ter 11 dígitos.');
      return;
    }
    if (!validateCpfChecksum(cpfDigits)) {
      setStatus('error');
      setErrorMsg('CPF inválido. Confere os dígitos.');
      return;
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      const updated = await updateMe({ documentNumber: cpfDigits, documentType: 'cpf' });
      onUpdated(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar CPF.');
    }
  }

  return (
    <Section title="Pessoa física">
      <p className="-mt-2 mb-2 text-xs text-muted-foreground">
        Necessário pra emissão de nota fiscal e fluxos de pagamento.
      </p>
      <Field label="CPF" hint="11 dígitos. Salvamos como número puro; mostramos formatado.">
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
      <FormFooter
        error={status === 'error' ? errorMsg : null}
        success={status === 'saved' ? 'CPF atualizado.' : null}
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

/**
 * Validador CPF módulo 11 (espelha DocumentVO.validateCPF do backend).
 */
function validateCpfChecksum(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number.parseInt(clean[i] ?? '0', 10) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== Number.parseInt(clean[9] ?? '-1', 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number.parseInt(clean[i] ?? '0', 10) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === Number.parseInt(clean[10] ?? '-1', 10);
}

// ─── Endereço ───────────────────────────────────────────────────────────

interface EnderecoSectionProps {
  initial: MeResponse;
  onUpdated: (next: MeResponse) => void;
}

export function EnderecoSection({ initial, onUpdated }: EnderecoSectionProps) {
  const [cep, setCep] = React.useState(formatCep(initial.cep ?? ''));
  const [street, setStreet] = React.useState(initial.addressStreet ?? '');
  const [number, setNumber] = React.useState(initial.addressNumber ?? '');
  const [complement, setComplement] = React.useState(initial.addressComplement ?? '');
  const [neighborhood, setNeighborhood] = React.useState(initial.addressNeighborhood ?? '');
  const [city, setCity] = React.useState(initial.city ?? '');
  const [state, setState] = React.useState(initial.state ?? '');
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [cepLookup, setCepLookup] = React.useState<'idle' | 'loading' | 'not_found'>('idle');

  React.useEffect(() => {
    setCep(formatCep(initial.cep ?? ''));
    setStreet(initial.addressStreet ?? '');
    setNumber(initial.addressNumber ?? '');
    setComplement(initial.addressComplement ?? '');
    setNeighborhood(initial.addressNeighborhood ?? '');
    setCity(initial.city ?? '');
    setState(initial.state ?? '');
  }, [initial]);

  const cepDigits = cep.replace(/\D/g, '');

  const dirty =
    cepDigits !== (initial.cep ?? '') ||
    street !== (initial.addressStreet ?? '') ||
    number !== (initial.addressNumber ?? '') ||
    complement !== (initial.addressComplement ?? '') ||
    neighborhood !== (initial.addressNeighborhood ?? '') ||
    city !== (initial.city ?? '') ||
    state !== (initial.state ?? '');

  function clearStatusOnChange() {
    if (status === 'error' || status === 'saved') setStatus('idle');
    if (cepLookup === 'not_found') setCepLookup('idle');
  }

  async function handleCepBlur() {
    if (cepDigits.length !== 8) return;
    setCepLookup('loading');
    const data = await lookupCep(cepDigits);
    if (!data) {
      setCepLookup('not_found');
      return;
    }
    setCepLookup('idle');
    if (data.logradouro) setStreet(data.logradouro);
    if (data.bairro) setNeighborhood(data.bairro);
    if (data.localidade) setCity(data.localidade);
    if (data.uf) setState(data.uf);
  }

  function validate(): string | null {
    if (cepDigits.length > 0 && cepDigits.length !== 8) return 'CEP deve ter 8 dígitos.';
    if (state.length > 0 && !isBrazilianState(state)) return 'UF inválida.';
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
    try {
      const updated = await updateMe({
        cep: cepDigits || undefined,
        addressStreet: street || undefined,
        addressNumber: number || undefined,
        addressComplement: complement || undefined,
        addressNeighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
      });
      onUpdated(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar endereço.');
    }
  }

  return (
    <Section title="Endereço">
      <p className="-mt-2 mb-2 text-xs text-muted-foreground">
        Pra correspondência e nota fiscal. Preenchemos automático quando você digita o CEP.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
        <Field
          label="CEP"
          hint={
            cepLookup === 'loading'
              ? 'Consultando…'
              : cepLookup === 'not_found'
                ? 'CEP não encontrado.'
                : '8 dígitos.'
          }
        >
          <input
            type="text"
            inputMode="numeric"
            value={cep}
            onChange={(e) => {
              setCep(formatCep(e.target.value));
              clearStatusOnChange();
            }}
            onBlur={() => void handleCepBlur()}
            placeholder="00000-000"
            maxLength={9}
            autoComplete="postal-code"
            className={inputCls(false)}
          />
        </Field>
        <Field label="Logradouro">
          <input
            type="text"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              clearStatusOnChange();
            }}
            placeholder="Av. Atlântica"
            autoComplete="address-line1"
            className={inputCls(false)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
        <Field label="Número">
          <input
            type="text"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              clearStatusOnChange();
            }}
            placeholder="1500"
            autoComplete="address-line2"
            className={inputCls(false)}
          />
        </Field>
        <Field label="Complemento (opcional)">
          <input
            type="text"
            value={complement}
            onChange={(e) => {
              setComplement(e.target.value);
              clearStatusOnChange();
            }}
            placeholder="apto 301"
            className={inputCls(false)}
          />
        </Field>
      </div>
      <Field label="Bairro">
        <input
          type="text"
          value={neighborhood}
          onChange={(e) => {
            setNeighborhood(e.target.value);
            clearStatusOnChange();
          }}
          placeholder="Copacabana"
          className={inputCls(false)}
        />
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
            placeholder="Rio de Janeiro"
            autoComplete="address-level2"
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
        success={status === 'saved' ? 'Endereço atualizado.' : null}
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

// ─── Preferências (tema) ───────────────────────────────────────────────

export function PreferenciasSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; label: string; hint: string }[] = [
    { value: 'light', label: 'Claro', hint: 'Tema claro fixo' },
    { value: 'dark', label: 'Escuro', hint: 'Tema escuro fixo' },
    { value: 'system', label: 'Sistema', hint: 'Segue preferência do dispositivo' },
  ];

  return (
    <Section title="Preferências">
      <Field label="Tema" hint="Aplica-se em todo o app.">
        <div className="grid grid-cols-3 gap-2">
          {options.map((opt) => {
            const isOn = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  isOn
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-transparent hover:border-foreground/20',
                )}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      </Field>
    </Section>
  );
}

// ─── Notificações ──────────────────────────────────────────────────────

interface NotificacoesSectionProps {
  initial: MeResponse;
  onUpdated: (next: MeResponse) => void;
}

const NOTIF_TYPES: {
  key: keyof NonNullable<NotificationPrefs['email']>;
  label: string;
  hint: string;
}[] = [
  {
    key: 'enrollment',
    label: 'Inscrições em modalidades',
    hint: 'Aprovação ou rejeição da sua solicitação.',
  },
  {
    key: 'booking',
    label: 'Reservas',
    hint: 'Confirmação ou cancelamento de reserva.',
  },
  {
    key: 'tournament',
    label: 'Torneios',
    hint: 'Próximo torneio em que você está inscrito.',
  },
  {
    key: 'invitation',
    label: 'Convites',
    hint: 'Convite recebido pra entrar num Klub.',
  },
  {
    key: 'announcement',
    label: 'Anúncios do Klub',
    hint: 'Mensagens do Klub Admin.',
  },
];

export function NotificacoesSection({ initial, onUpdated }: NotificacoesSectionProps) {
  // Default opt-in: missing key = true.
  const initialEmail = React.useMemo(() => initial.notificationPrefs?.email ?? {}, [initial]);

  const [email, setEmail] = React.useState<NonNullable<NotificationPrefs['email']>>({
    enrollment: initialEmail.enrollment ?? true,
    booking: initialEmail.booking ?? true,
    tournament: initialEmail.tournament ?? true,
    invitation: initialEmail.invitation ?? true,
    announcement: initialEmail.announcement ?? true,
  });
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    const e = initial.notificationPrefs?.email ?? {};
    setEmail({
      enrollment: e.enrollment ?? true,
      booking: e.booking ?? true,
      tournament: e.tournament ?? true,
      invitation: e.invitation ?? true,
      announcement: e.announcement ?? true,
    });
  }, [initial]);

  const dirty = NOTIF_TYPES.some((t) => email[t.key] !== (initialEmail[t.key] ?? true));

  function toggle(key: keyof NonNullable<NotificationPrefs['email']>) {
    setEmail((prev) => ({ ...prev, [key]: !prev[key] }));
    if (status === 'error' || status === 'saved') setStatus('idle');
  }

  async function handleSave() {
    if (!dirty || status === 'saving') return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const updated = await updateMe({ notificationPrefs: { email } });
      onUpdated(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar.');
    }
  }

  return (
    <Section title="Notificações">
      <p className="-mt-2 mb-1 text-xs text-muted-foreground">
        Por e-mail. Push notifications chegam em breve.
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {NOTIF_TYPES.map((t) => (
          <li key={t.key} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <Toggle checked={!!email[t.key]} onChange={() => toggle(t.key)} ariaLabel={t.label} />
          </li>
        ))}
      </ul>
      <FormFooter
        error={status === 'error' ? errorMsg : null}
        success={status === 'saved' ? 'Preferências salvas.' : null}
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

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 rounded-full bg-card shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

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
          'mb-2 font-display text-xs font-bold uppercase tracking-[0.06em]',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 md:p-4">
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
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
          <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="flex items-start gap-1.5 text-xs text-success" role="status">
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
          <p className="text-sm font-semibold">{label}</p>
          {email ? (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
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
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors',
    'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hasError && 'border-destructive ring-[3px] ring-destructive/20',
  );

const primaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';

const ghostBtnCls =
  'inline-flex h-9 items-center gap-2 rounded-lg bg-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';
