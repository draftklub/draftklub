'use client';

/**
 * Sprint O batch O-8 — PessoaFisicaSection + EnderecoSection extraídas
 * de _components.tsx.
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import type { MeResponse } from '@draftklub/shared-types';
import { updateMe } from '@/lib/api/me';
import { BRAZILIAN_STATES, isBrazilianState } from '@/lib/brazilian-states';
import { formatCep, formatCpf, lookupCep } from '@/lib/viacep';
import { cn } from '@/lib/utils';
import {
  Field,
  FormFooter,
  Section,
  inputCls,
  primaryBtnCls,
  validateCpfChecksum,
} from './_primitivos';

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

// validateCpfChecksum → importada de ./_primitivos

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
