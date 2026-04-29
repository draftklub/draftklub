'use client';

/**
 * Sprint L PR-L5 — coleção de step-components do wizard /criar-klub.
 *
 * Migrado da page.tsx monolítica de 1271 linhas. Wizard mantém state
 * centralizado em CriarKlubFlow; cada step recebe props + callbacks.
 *
 * Exports:
 * - `Stepper` — barra de progresso 1-4
 * - `Step1Identidade` / `Step2Endereco` / `Step3Modalidades` / `Step4Revisao`
 * - `inferKlubType` — helper de inferência via CNAE
 * - `KLUB_TYPES` — lista canônica
 * - `Field` — wrapper visual reusado em todos steps
 */

import * as React from 'react';
import { Check, CheckCircle2, Loader2, MapPin, Pencil, Search } from 'lucide-react';
import type {
  CnpjLookupResult,
  KlubAddressSource,
  KlubType,
  SportCatalog,
} from '@draftklub/shared-types';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import { hintDocument, maskCnpj, maskCpf, onlyDigits } from '@/lib/format-document';
import { cn } from '@/lib/utils';

export const KLUB_TYPES: { value: KlubType; label: string; hint: string }[] = [
  { value: 'sports_club', label: 'Clube esportivo', hint: 'tradicional, com sócios' },
  { value: 'arena', label: 'Arena / Centro', hint: 'comercial: padel, beach tennis' },
  { value: 'academy', label: 'Academia', hint: 'aulas + locação de quadra' },
  { value: 'condo', label: 'Condomínio', hint: 'quadras pra moradores' },
  { value: 'hotel_resort', label: 'Hotel / Resort', hint: 'quadras de hotel' },
  { value: 'university', label: 'Universidade', hint: 'campus universitário' },
  { value: 'school', label: 'Escola / Colégio', hint: 'K-12' },
  { value: 'public_space', label: 'Espaço público', hint: 'praça, parque, quadra municipal' },
  { value: 'individual', label: 'Pessoa física', hint: 'quadra particular' },
];

/**
 * Sprint Polish PR-G — sugere tipo do Klub baseado em CNAE/natureza
 * jurídica retornados pela BrasilAPI. User pode override no select.
 * Heurística simples; quando não bate, mantém o que user já escolheu.
 */
export function inferKlubType(data: CnpjLookupResult): KlubType | null {
  const raw = data.raw;
  const cnae = typeof raw.cnae_fiscal === 'number' ? raw.cnae_fiscal : null;
  const natureza =
    typeof raw.natureza_juridica === 'string' ? raw.natureza_juridica.toLowerCase() : '';

  if (natureza.includes('condom')) return 'condo';
  if (cnae === 9312300) return 'sports_club';
  if (cnae === 9311500) return 'arena';
  if (cnae && cnae >= 8511200 && cnae <= 8512100) return 'university';
  if (cnae && cnae >= 8513900 && cnae <= 8520100) return 'school';
  if (cnae === 5510801 || cnae === 5590601) return 'hotel_resort';
  return null;
}

export type Step = 1 | 2 | 3 | 4;

export function Stepper({ step }: { step: Step }) {
  const labels = ['Identidade', 'Endereço', 'Modalidades', 'Revisão'];
  return (
    <ol className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-[hsl(var(--brand-primary-600))]'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : n}
            </span>
            <span
              className={cn(
                'truncate text-xs font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 ? (
              <span
                className={cn(
                  'mx-1 hidden h-px flex-1 sm:block',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1 ─────────────────────────────────────────────────────────────

interface Step1Props {
  entityType: 'pj' | 'pf' | null;
  setEntityType: (v: 'pj' | 'pf') => void;
  name: string;
  setName: (v: string) => void;
  commonName: string;
  setCommonName: (v: string) => void;
  legalName: string;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  type: KlubType;
  setType: (v: KlubType) => void;
  cnpj: string;
  setCnpj: (v: string) => void;
  cnpjValid: boolean;
  cnpjLookupLoading: boolean;
  cnpjLookupData: CnpjLookupResult | null;
  cnpjLookupTried: boolean;
  onLookupCnpj: () => void;
  creatorCpf: string;
  setCreatorCpf: (v: string) => void;
  cpfValid: boolean;
  userHasCpfAlready: boolean;
  meCpf: string | null;
}

export function Step1Identidade(p: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Quem é você</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O Klub está no nome de uma empresa (CNPJ) ou no seu CPF?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EntityCard
          label="PJ — Pessoa Jurídica"
          hint="Klub com CNPJ próprio (clube, escola, academia, etc.)"
          selected={p.entityType === 'pj'}
          onClick={() => p.setEntityType('pj')}
        />
        <EntityCard
          label="PF — Pessoa Física"
          hint="Você gerencia o Klub no seu CPF (operador individual, espaço público)"
          selected={p.entityType === 'pf'}
          onClick={() => p.setEntityType('pf')}
        />
      </div>

      {p.entityType === 'pj' ? (
        <div className="space-y-3">
          <Field label="CNPJ" required>
            <div className="flex gap-2">
              <input
                value={p.cnpj}
                onChange={(e) => p.setCnpj(maskCnpj(e.target.value))}
                placeholder="XX.XXX.XXX/XXXX-XX"
                inputMode="numeric"
                className="h-11 flex-1 rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
              <button
                type="button"
                onClick={p.onLookupCnpj}
                disabled={!p.cnpjValid || p.cnpjLookupLoading}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {p.cnpjLookupLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                Buscar dados
              </button>
            </div>
          </Field>
          {p.cnpjLookupData ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
              <p className="font-semibold text-success">
                <CheckCircle2 className="mr-1 inline size-3.5" />
                {p.cnpjLookupData.razaoSocial ?? '(sem razão social)'}
              </p>
              {p.cnpjLookupData.nomeFantasia ? (
                <p className="mt-0.5 text-muted-foreground">
                  Fantasia: {p.cnpjLookupData.nomeFantasia}
                </p>
              ) : null}
              <p className="mt-1.5 text-muted-foreground">
                Preenchemos pra você: razão social, nome popular, endereço
                {p.cnpjLookupData.contato.email ? ', email' : ''}
                {p.cnpjLookupData.contato.telefone ? ', telefone' : ''}. Você pode editar no próximo
                passo.
              </p>
            </div>
          ) : p.cnpjLookupTried && !p.cnpjLookupLoading ? (
            <p className="text-xs text-muted-foreground">
              Não achamos dados na Receita. Você pode preencher manualmente o endereço.
            </p>
          ) : null}
        </div>
      ) : null}

      {p.entityType === 'pf' ? (
        <div className="space-y-3">
          {p.userHasCpfAlready ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              Vamos usar o CPF cadastrado no seu perfil:{' '}
              <span className="font-mono font-semibold">{hintDocument(p.meCpf ?? '', 'cpf')}</span>
            </div>
          ) : (
            <Field label="Seu CPF" required hint="Será salvo no seu perfil pra próximas operações.">
              <input
                value={p.creatorCpf}
                onChange={(e) => p.setCreatorCpf(maskCpf(e.target.value))}
                placeholder="XXX.XXX.XXX-XX"
                inputMode="numeric"
                className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </Field>
          )}
        </div>
      ) : null}

      {p.entityType ? (
        <>
          <Field label="Nome do Klub" required>
            <input
              value={p.name}
              onChange={(e) => p.setName(e.target.value)}
              placeholder="Ex: Tennis Club Botafogo"
              maxLength={100}
              className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </Field>

          <Field
            label="Nome usual"
            hint="Como o pessoal chama no dia a dia. Ex: 'Paissandú' pra 'Paissandu Atletico Clube'."
          >
            <input
              value={p.commonName}
              onChange={(e) => p.setCommonName(e.target.value)}
              placeholder="(opcional)"
              maxLength={100}
              className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </Field>

          {p.entityType === 'pj' && p.legalName ? (
            <Field label="Razão social" hint="Vem da Receita; só admin altera depois.">
              <input
                value={p.legalName}
                disabled
                className="h-11 w-full rounded-md border border-input bg-muted px-3.5 text-sm text-muted-foreground"
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email público" hint="Aparece no card do Klub.">
              <input
                type="email"
                value={p.email}
                onChange={(e) => p.setEmail(e.target.value)}
                placeholder="contato@seuklub.com.br"
                maxLength={150}
                className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={p.phone}
                onChange={(e) => p.setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={30}
                className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </Field>
          </div>

          <Field label="Tipo">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {KLUB_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => p.setType(t.value)}
                  className={cn(
                    'flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors',
                    p.type === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                >
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.hint}</span>
                </button>
              ))}
            </div>
          </Field>
        </>
      ) : null}
    </div>
  );
}

function EntityCard({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-xl border p-4 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span className="font-display text-sm font-bold">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

// ─── Step 2 ─────────────────────────────────────────────────────────────

interface Step2Props {
  cep: string;
  setCep: (v: string) => void;
  addressStreet: string;
  setAddressStreet: (v: string) => void;
  addressNumber: string;
  setAddressNumber: (v: string) => void;
  addressComplement: string;
  setAddressComplement: (v: string) => void;
  addressNeighborhood: string;
  setAddressNeighborhood: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  addressSource: KlubAddressSource;
  setAddressSource: (v: KlubAddressSource) => void;
  cnpjLookupApplied: boolean;
}

export function Step2Endereco(p: Step2Props) {
  const locked = p.addressSource === 'cnpj_lookup';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Onde fica o Klub</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Endereço completo. Bairro e cidade entram na URL pública do Klub.
        </p>
      </div>

      {locked ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs">
            <p className="font-semibold">Dados da Receita Federal</p>
            <p className="text-muted-foreground">
              Endereço preenchido automaticamente. Pra alterar, clique ao lado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => p.setAddressSource('manual')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3" />
            Editar manualmente
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="CEP">
          <input
            value={p.cep}
            onChange={(e) => p.setCep(onlyDigits(e.target.value).slice(0, 8))}
            placeholder="22440000"
            inputMode="numeric"
            disabled={locked}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Rua">
            <input
              value={p.addressStreet}
              onChange={(e) => p.setAddressStreet(e.target.value)}
              placeholder="Rua, avenida..."
              disabled={locked}
              className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Número">
          <input
            value={p.addressNumber}
            onChange={(e) => p.setAddressNumber(e.target.value)}
            placeholder="100"
            disabled={locked}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Complemento (opcional)">
            <input
              value={p.addressComplement}
              onChange={(e) => p.setAddressComplement(e.target.value)}
              placeholder="Sala, andar, bloco..."
              className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </Field>
        </div>
      </div>

      <Field label="Bairro" required>
        <input
          value={p.addressNeighborhood}
          onChange={(e) => p.setAddressNeighborhood(e.target.value)}
          placeholder="Botafogo"
          disabled={locked}
          className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade" required>
          <input
            value={p.city}
            onChange={(e) => p.setCity(e.target.value)}
            placeholder="Rio de Janeiro"
            disabled={locked}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <Field label="UF" required>
          <select
            value={p.state}
            onChange={(e) => p.setState(e.target.value)}
            disabled={locked}
            className="h-11 w-full rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
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
    </div>
  );
}

// ─── Step 3 ─────────────────────────────────────────────────────────────

interface Step3Props {
  sports: SportCatalog[] | null;
  sportError: string | null;
  selectedSports: Set<string>;
  setSelectedSports: React.Dispatch<React.SetStateAction<Set<string>>>;
  discoverable: boolean;
  setDiscoverable: (v: boolean) => void;
  accessMode: 'public' | 'private';
  setAccessMode: (v: 'public' | 'private') => void;
}

export function Step3Modalidades(p: Step3Props) {
  function toggleSport(code: string) {
    p.setSelectedSports((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-display text-lg font-bold">Modalidades</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quais esportes seu Klub oferece? Selecione pelo menos uma.
        </p>
      </div>

      {p.sportError ? (
        <p className="text-sm text-destructive">{p.sportError}</p>
      ) : p.sports === null ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {p.sports.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => toggleSport(s.code)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                p.selectedSports.has(s.code)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {p.selectedSports.has(s.code) ? <Check className="size-3" /> : null}
              {s.name}
            </button>
          ))}
        </div>
      )}

      <hr className="border-border" />

      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-bold">Visibilidade na plataforma</h3>
          <p className="text-xs text-muted-foreground">
            Controla se outros usuários vão achar seu Klub na busca pública.
          </p>
        </div>

        <ToggleCard
          checked={p.discoverable}
          onChange={p.setDiscoverable}
          title="Aparecer na busca pública"
          hint={
            p.discoverable
              ? 'Seu Klub vai aparecer em /buscar-klubs pra qualquer usuário.'
              : 'Off — Klub só será encontrado por convite/link direto.'
          }
        />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-bold">Modo de acesso</h3>
          <p className="text-xs text-muted-foreground">
            Como novos jogadores entram no Klub. Independente da visibilidade.
          </p>
        </div>

        <div className="space-y-2">
          <RadioCard
            checked={p.accessMode === 'public'}
            onChange={() => p.setAccessMode('public')}
            title="Aberto"
            hint="Qualquer pessoa pode entrar como Jogador direto."
          />
          <RadioCard
            checked={p.accessMode === 'private'}
            onChange={() => p.setAccessMode('private')}
            title="Aprovação manual"
            hint="Você revisa e autoriza cada entrada. (UI completa em breve)"
            badge="em breve"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span
        className={cn(
          'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'size-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}

function RadioCard({
  checked,
  onChange,
  title,
  hint,
  badge,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-primary' : 'border-border',
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-semibold">{title}</span>
        {badge ? (
          <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 align-middle text-xs font-bold uppercase tracking-[0.06em]">
            {badge}
          </span>
        ) : null}
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

// ─── Step 4 ─────────────────────────────────────────────────────────────

interface Step4Props {
  name: string;
  entityType: 'pj' | 'pf' | null;
  cnpjDigits: string;
  cpfFinal: string;
  cnpjLookupData: CnpjLookupResult | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  city: string;
  state: string;
  cep: string;
  addressSource: KlubAddressSource;
  selectedSports: Set<string>;
  sports: SportCatalog[] | null;
  discoverable: boolean;
  accessMode: 'public' | 'private';
  slugCheck: {
    slug: string;
    available: boolean;
    suggestedSlug: string | null;
    conflictKlubName: string | null;
  } | null;
  slugChecking: boolean;
}

export function Step4Revisao(p: Step4Props) {
  const sportLabels = (p.sports ?? [])
    .filter((s) => p.selectedSports.has(s.code))
    .map((s) => s.name);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Revisão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira os dados antes de enviar pra análise.
        </p>
      </div>

      <ReviewBlock title="Identidade">
        <p>
          <strong>{p.name}</strong>
        </p>
        <p className="text-muted-foreground">
          {p.entityType === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'} ·{' '}
          <span className="font-mono">
            {p.entityType === 'pj'
              ? hintDocument(p.cnpjDigits, 'cnpj')
              : hintDocument(p.cpfFinal, 'cpf')}
          </span>
        </p>
        {p.cnpjLookupData?.razaoSocial ? (
          <p className="text-muted-foreground">{p.cnpjLookupData.razaoSocial}</p>
        ) : null}
      </ReviewBlock>

      <ReviewBlock title="Endereço">
        <p>
          {p.addressStreet}
          {p.addressNumber ? `, ${p.addressNumber}` : ''}
          {p.addressComplement ? ` — ${p.addressComplement}` : ''}
        </p>
        <p className="text-muted-foreground">
          {p.addressNeighborhood} · {p.city}/{p.state}
          {p.cep ? ` · CEP ${p.cep}` : ''}
        </p>
        {p.addressSource === 'cnpj_lookup' ? (
          <p className="text-xs text-muted-foreground">Auto-preenchido pela Receita.</p>
        ) : null}
      </ReviewBlock>

      <ReviewBlock title="Modalidades">
        <p>{sportLabels.join(', ') || '—'}</p>
      </ReviewBlock>

      <ReviewBlock title="Visibilidade & Acesso">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={p.discoverable ? 'green' : 'muted'}>
            {p.discoverable ? 'Visível na busca' : 'Oculto na busca'}
          </Badge>
          <Badge tone={p.accessMode === 'public' ? 'green' : 'muted'}>
            {p.accessMode === 'public' ? 'Aberto' : 'Aprovação'}
          </Badge>
        </div>
      </ReviewBlock>

      <ReviewBlock title="URL do Klub">
        {p.slugChecking || !p.slugCheck ? (
          <p className="font-mono text-muted-foreground">—</p>
        ) : (
          <div className="space-y-1.5">
            <p className="font-mono">
              <MapPin className="mr-1 inline size-3.5" />
              draftklub.com/k/<strong>{p.slugCheck.slug || '...'}</strong>
            </p>
            {p.slugCheck.available ? (
              <Badge tone="green">URL livre</Badge>
            ) : (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
                Já existe um Klub com essa URL{' '}
                {p.slugCheck.conflictKlubName ? `(${p.slugCheck.conflictKlubName})` : ''}.
                {p.slugCheck.suggestedSlug ? (
                  <>
                    {' '}
                    Sugerido: <strong className="font-mono">{p.slugCheck.suggestedSlug}</strong>.
                  </>
                ) : null}{' '}
                A equipe vai ajustar isso na aprovação.
              </div>
            )}
          </div>
        )}
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'green' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-bold uppercase tracking-[0.06em]',
        tone === 'green' ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

// ─── Field helper ───────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
