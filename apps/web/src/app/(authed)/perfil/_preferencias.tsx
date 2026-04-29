'use client';

/**
 * Sprint O batch O-8 — PreferenciasSection + NotificacoesSection extraídas
 * de _components.tsx.
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import type { MeResponse, NotificationPrefs } from '@draftklub/shared-types';
import { updateMe } from '@/lib/api/me';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Field, FormFooter, Section, primaryBtnCls } from './_primitivos';

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
