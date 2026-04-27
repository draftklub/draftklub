'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { createKlubRequest } from '@/lib/api/klub-requests';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

export default function QueroCriarKlubPage() {
  const [contactName, setContactName] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [estimatedMembers, setEstimatedMembers] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      await createKlubRequest({
        contactName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        name,
        city,
        state,
        estimatedMembers: estimatedMembers ? Number.parseInt(estimatedMembers, 10) : undefined,
        message: message || undefined,
      });
      setStatus('sent');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar. Tenta de novo.');
    }
  }

  if (status === 'sent') {
    return <SentScreen contactName={contactName} />;
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 md:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
          <BrandLockup size="sm" />
        </div>

        <h1
          className="font-display text-[28px] font-bold md:text-[36px]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Quero criar um Klub
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Conta um pouco do seu Klub. Nosso time entra em contato em até 2 dias úteis pra montar
          tudo junto.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-8 flex flex-col gap-5 rounded-xl border border-border bg-card p-6 md:p-8"
          noValidate
        >
          <Section title="Sobre você">
            <Field label="Nome" id="contactName" required>
              <input
                id="contactName"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="E-mail" id="contactEmail" required>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Telefone (opcional)" id="contactPhone">
              <input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(21) 9 9999-9999"
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="Sobre o Klub">
            <Field label="Nome do Klub" id="name" required>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px]">
              <Field label="Cidade" id="city" required>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="UF" id="state" required>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className={cn(inputCls, 'pr-2')}
                >
                  <option value="" disabled>
                    —
                  </option>
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Quantos sócios estimados?" id="estimatedMembers">
              <input
                id="estimatedMembers"
                type="number"
                min={1}
                value={estimatedMembers}
                onChange={(e) => setEstimatedMembers(e.target.value)}
                placeholder="Ex: 200"
                className={inputCls}
              />
            </Field>
            <Field label="Mensagem (opcional)" id="message">
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Quadras, modalidades, prazo desejado…"
                className={cn(inputCls, 'min-h-22 py-2.5')}
              />
            </Field>
          </Section>

          {errorMsg ? (
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
              'Enviar pedido'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function SentScreen({ contactName }: { contactName: string }) {
  const firstName = contactName.split(' ')[0] ?? 'Você';
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
          Recebemos seu pedido, {firstName}!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nosso time vai analisar e entrar em contato em até 2 dias úteis pelo e-mail e telefone que
          você passou.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Voltar pra tela inicial
        </Link>
      </div>
    </main>
  );
}

const inputCls =
  'h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  id,
  required,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}
