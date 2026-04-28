'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Search,
} from 'lucide-react';
import type {
  CnpjLookupResult,
  KlubAddressSource,
  KlubType,
  MeResponse,
  SportCatalog,
} from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';
import { checkKlubSlug, createKlub, lookupCnpj } from '@/lib/api/klubs';
import { getMe } from '@/lib/api/me';
import { listSports } from '@/lib/api/sports';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import {
  hintDocument,
  isValidCnpj,
  isValidCpf,
  maskCnpj,
  maskCpf,
  onlyDigits,
} from '@/lib/format-document';
import { cn } from '@/lib/utils';

const KLUB_TYPES: { value: KlubType; label: string; hint: string }[] = [
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
function inferKlubType(data: CnpjLookupResult): KlubType | null {
  const raw = data.raw;
  const cnae = typeof raw.cnae_fiscal === 'number' ? raw.cnae_fiscal : null;
  const natureza =
    typeof raw.natureza_juridica === 'string' ? raw.natureza_juridica.toLowerCase() : '';

  if (natureza.includes('condom')) return 'condo';
  if (cnae === 9312300) return 'sports_club'; // Clubes sociais, esportivos
  if (cnae === 9311500) return 'arena'; // Gestão de instalações esportivas
  if (cnae && cnae >= 8511200 && cnae <= 8512100) return 'university';
  if (cnae && cnae >= 8513900 && cnae <= 8520100) return 'school';
  if (cnae === 5510801 || cnae === 5590601) return 'hotel_resort';
  return null;
}

type Step = 1 | 2 | 3 | 4;

export default function CriarKlubPage() {
  return <CriarKlubFlow />;
}

function CriarKlubFlow() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>(1);
  const [me, setMe] = React.useState<MeResponse | null>(null);

  // Step 1 — Identidade
  const [entityType, setEntityType] = React.useState<'pj' | 'pf' | null>(null);
  const [name, setName] = React.useState('');
  const [commonName, setCommonName] = React.useState('');
  const [legalName, setLegalName] = React.useState('');
  const [type, setType] = React.useState<KlubType>('sports_club');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');

  // PJ
  const [cnpj, setCnpj] = React.useState(''); // mascarado
  const [cnpjLookupLoading, setCnpjLookupLoading] = React.useState(false);
  const [cnpjLookupData, setCnpjLookupData] = React.useState<CnpjLookupResult | null>(null);
  const [cnpjLookupTried, setCnpjLookupTried] = React.useState(false);

  // PF
  const [creatorCpf, setCreatorCpf] = React.useState(''); // mascarado, só usado se me.documentNumber=null

  // Step 2 — Endereço
  const [cep, setCep] = React.useState('');
  const [addressStreet, setAddressStreet] = React.useState('');
  const [addressNumber, setAddressNumber] = React.useState('');
  const [addressComplement, setAddressComplement] = React.useState('');
  const [addressNeighborhood, setAddressNeighborhood] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [addressSource, setAddressSource] = React.useState<KlubAddressSource>('manual');

  // Step 3 — Modalidades + visibilidade & acesso
  const [sports, setSports] = React.useState<SportCatalog[] | null>(null);
  const [sportError, setSportError] = React.useState<string | null>(null);
  const [selectedSports, setSelectedSports] = React.useState<Set<string>>(new Set());
  const [discoverable, setDiscoverable] = React.useState(false);
  const [accessMode, setAccessMode] = React.useState<'public' | 'private'>('public');

  // Step 4 — Slug preview + submit
  const [slugCheck, setSlugCheck] = React.useState<{
    slug: string;
    available: boolean;
    suggestedSlug: string | null;
    conflictKlubName: string | null;
  } | null>(null);
  const [slugChecking, setSlugChecking] = React.useState(false);

  const [stepError, setStepError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Boot
  React.useEffect(() => {
    void getMe()
      .then(setMe)
      .catch(() => null);
  }, []);

  React.useEffect(() => {
    if (step !== 3 || sports !== null) return;
    let cancelled = false;
    listSports()
      .then((data) => {
        if (!cancelled) setSports(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSportError(err instanceof Error ? err.message : 'Erro ao carregar modalidades');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, sports]);

  // Slug live preview no step 4 — debounce 300ms.
  React.useEffect(() => {
    if (step !== 4 || !name) return;
    let cancelled = false;
    setSlugChecking(true);
    const id = setTimeout(() => {
      checkKlubSlug({
        name,
        neighborhood: addressNeighborhood || undefined,
        city: city || undefined,
      })
        .then((res) => {
          if (!cancelled) {
            setSlugCheck(res);
            setSlugChecking(false);
          }
        })
        .catch(() => {
          if (!cancelled) setSlugChecking(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [step, name, addressNeighborhood, city]);

  function applyCnpjLookup(data: CnpjLookupResult) {
    setCnpjLookupData(data);

    // Endereço — sempre override (BrasilAPI é fonte autoritativa).
    if (data.endereco.cep) setCep(onlyDigits(data.endereco.cep));
    if (data.endereco.logradouro) setAddressStreet(data.endereco.logradouro);
    if (data.endereco.numero) setAddressNumber(data.endereco.numero);
    if (data.endereco.bairro) setAddressNeighborhood(data.endereco.bairro);
    if (data.endereco.municipio) setCity(data.endereco.municipio);
    if (data.endereco.uf) setState(data.endereco.uf);
    setAddressSource('cnpj_lookup');

    // Razão social — sempre vem da Receita.
    if (data.razaoSocial) setLegalName(data.razaoSocial);

    // Nome do Klub: se ainda vazio, sugere fantasia (ou razão social como fallback).
    setName((prev) => (prev.trim() ? prev : (data.nomeFantasia ?? data.razaoSocial ?? '')));

    // Nome popular = nome fantasia (se diferente da razão social e ainda vazio).
    if (data.nomeFantasia && data.nomeFantasia !== data.razaoSocial) {
      setCommonName((prev) => (prev.trim() ? prev : data.nomeFantasia ?? ''));
    }

    // Email/telefone só preenche se vazio (user pode ter intenção própria).
    if (data.contato.email) setEmail((prev) => prev || (data.contato.email ?? ''));
    if (data.contato.telefone) setPhone((prev) => prev || (data.contato.telefone ?? ''));

    // Sugestão de tipo via CNAE/natureza — sempre override (user confirma no select).
    const inferred = inferKlubType(data);
    if (inferred) setType(inferred);
  }

  async function handleCnpjLookup() {
    const digits = onlyDigits(cnpj);
    if (!isValidCnpj(digits)) {
      setStepError('CNPJ inválido. Confira os dígitos.');
      return;
    }
    setStepError(null);
    setCnpjLookupLoading(true);
    setCnpjLookupTried(true);
    try {
      const data = await lookupCnpj(digits);
      if (data) {
        applyCnpjLookup(data);
      } else {
        setStepError(
          'Não conseguimos consultar a Receita Federal agora. Você pode preencher os dados manualmente.',
        );
      }
    } catch {
      setStepError('Falha ao consultar CNPJ. Preencha manualmente.');
    } finally {
      setCnpjLookupLoading(false);
    }
  }

  // Validações
  const userHasCpfAlready = !!me?.documentNumber;
  const cpfDigits = onlyDigits(creatorCpf);
  const cpfValid = userHasCpfAlready || isValidCpf(cpfDigits);
  const cnpjDigits = onlyDigits(cnpj);
  const cnpjValid = isValidCnpj(cnpjDigits);

  const canAdvanceStep1 = (() => {
    if (!entityType) return false;
    if (name.trim().length < 2) return false;
    if (entityType === 'pj') return cnpjValid;
    return cpfValid;
  })();

  const canAdvanceStep2 = !!city && !!state && !!addressNeighborhood;
  const canAdvanceStep3 = selectedSports.size > 0;

  function handleNext() {
    setStepError(null);
    if (step === 1 && !canAdvanceStep1) {
      setStepError('Preencha os campos obrigatórios.');
      return;
    }
    if (step === 2 && !canAdvanceStep2) {
      setStepError('Bairro, cidade e UF são obrigatórios pra gerar a URL do Klub.');
      return;
    }
    if (step === 3 && !canAdvanceStep3) {
      setStepError('Selecione pelo menos uma modalidade.');
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function handleSubmit() {
    if (submitting || !entityType) return;
    setSubmitting(true);
    setStepError(null);
    try {
      await createKlub({
        name: name.trim(),
        commonName: commonName.trim() || undefined,
        legalName: legalName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        type,
        entityType,
        document: entityType === 'pj' ? cnpjDigits : undefined,
        creatorCpf: entityType === 'pf' && !userHasCpfAlready ? cpfDigits : undefined,
        cep: cep ? onlyDigits(cep) : undefined,
        addressStreet: addressStreet || undefined,
        addressNumber: addressNumber || undefined,
        addressComplement: addressComplement || undefined,
        addressNeighborhood: addressNeighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
        addressSource,
        sportCodes: Array.from(selectedSports),
        discoverable,
        accessMode,
      });
      router.push(`/criar-klub/sucesso?name=${encodeURIComponent(name.trim())}`);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao enviar cadastro.';
      setStepError(msg);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/home"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar pra Home
        </Link>

        <header className="mb-8">
          <h1
            className="font-display text-[28px] font-bold md:text-[34px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Criar Klub
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Cadastre seu Klub na DraftKlub. Vamos validar os dados antes de publicar — leva até 2
            dias úteis.
          </p>
        </header>

        <Stepper step={step} />

        <div className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
          {step === 1 ? (
            <Step1Identidade
              entityType={entityType}
              setEntityType={setEntityType}
              name={name}
              setName={setName}
              commonName={commonName}
              setCommonName={setCommonName}
              legalName={legalName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              type={type}
              setType={setType}
              cnpj={cnpj}
              setCnpj={setCnpj}
              cnpjValid={cnpjValid}
              cnpjLookupLoading={cnpjLookupLoading}
              cnpjLookupData={cnpjLookupData}
              cnpjLookupTried={cnpjLookupTried}
              onLookupCnpj={() => void handleCnpjLookup()}
              creatorCpf={creatorCpf}
              setCreatorCpf={setCreatorCpf}
              cpfValid={cpfValid}
              userHasCpfAlready={userHasCpfAlready}
              meCpf={me?.documentNumber ?? null}
            />
          ) : null}

          {step === 2 ? (
            <Step2Endereco
              cep={cep}
              setCep={setCep}
              addressStreet={addressStreet}
              setAddressStreet={setAddressStreet}
              addressNumber={addressNumber}
              setAddressNumber={setAddressNumber}
              addressComplement={addressComplement}
              setAddressComplement={setAddressComplement}
              addressNeighborhood={addressNeighborhood}
              setAddressNeighborhood={setAddressNeighborhood}
              city={city}
              setCity={setCity}
              state={state}
              setState={setState}
              addressSource={addressSource}
              setAddressSource={setAddressSource}
              cnpjLookupApplied={addressSource === 'cnpj_lookup'}
            />
          ) : null}

          {step === 3 ? (
            <Step3Modalidades
              sports={sports}
              sportError={sportError}
              selectedSports={selectedSports}
              setSelectedSports={setSelectedSports}
              discoverable={discoverable}
              setDiscoverable={setDiscoverable}
              accessMode={accessMode}
              setAccessMode={setAccessMode}
            />
          ) : null}

          {step === 4 ? (
            <Step4Revisao
              name={name}
              entityType={entityType}
              cnpjDigits={cnpjDigits}
              cpfFinal={userHasCpfAlready ? (me?.documentNumber ?? '') : cpfDigits}
              cnpjLookupData={cnpjLookupData}
              addressStreet={addressStreet}
              addressNumber={addressNumber}
              addressComplement={addressComplement}
              addressNeighborhood={addressNeighborhood}
              city={city}
              state={state}
              cep={cep}
              addressSource={addressSource}
              selectedSports={selectedSports}
              sports={sports}
              discoverable={discoverable}
              accessMode={accessMode}
              slugCheck={slugCheck}
              slugChecking={slugChecking}
            />
          ) : null}

          {stepError ? (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[13px] text-destructive">
              {stepError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Próximo
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  Enviar pra análise
                  <Check className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Stepper({ step }: { step: Step }) {
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
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
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
                'truncate text-[12px] font-medium',
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

function Step1Identidade(p: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold">Quem é você</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
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
                className="h-11 flex-1 rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
              <button
                type="button"
                onClick={p.onLookupCnpj}
                disabled={!p.cnpjValid || p.cnpjLookupLoading}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="rounded-lg border border-[hsl(142_71%_32%/0.3)] bg-[hsl(142_71%_32%/0.05)] p-3 text-[12.5px]">
              <p className="font-semibold text-[hsl(142_71%_32%)]">
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
                {p.cnpjLookupData.contato.telefone ? ', telefone' : ''}
                . Você pode editar no próximo passo.
              </p>
            </div>
          ) : p.cnpjLookupTried && !p.cnpjLookupLoading ? (
            <p className="text-[12px] text-muted-foreground">
              Não achamos dados na Receita. Você pode preencher manualmente o endereço.
            </p>
          ) : null}
        </div>
      ) : null}

      {p.entityType === 'pf' ? (
        <div className="space-y-3">
          {p.userHasCpfAlready ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-[13px]">
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
                className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
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
              className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </Field>

          <Field
            label="Comumente chamado de"
            hint="Apelido popular pra busca informal. Ex: 'Paissandú' pra 'Paissandu Atletico Clube'."
          >
            <input
              value={p.commonName}
              onChange={(e) => p.setCommonName(e.target.value)}
              placeholder="(opcional)"
              maxLength={100}
              className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
            />
          </Field>

          {p.entityType === 'pj' && p.legalName ? (
            <Field label="Razão social" hint="Vem da Receita; só admin altera depois.">
              <input
                value={p.legalName}
                disabled
                className="h-11 w-full rounded-[10px] border border-input bg-muted px-3.5 text-[15px] text-muted-foreground"
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
                className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={p.phone}
                onChange={(e) => p.setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={30}
                className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
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
                  <span className="text-[13.5px] font-semibold">{t.label}</span>
                  <span className="text-[11.5px] text-muted-foreground">{t.hint}</span>
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
      <span className="font-display text-[15px] font-bold">{label}</span>
      <span className="mt-1 text-[12.5px] text-muted-foreground">{hint}</span>
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

function Step2Endereco(p: Step2Props) {
  const locked = p.addressSource === 'cnpj_lookup';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Onde fica o Klub</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Endereço completo. Bairro e cidade entram na URL pública do Klub.
        </p>
      </div>

      {locked ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-[12.5px]">
            <p className="font-semibold">Dados da Receita Federal</p>
            <p className="text-muted-foreground">
              Endereço preenchido automaticamente. Pra alterar, clique ao lado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => p.setAddressSource('manual')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium hover:bg-muted"
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
            className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Rua">
            <input
              value={p.addressStreet}
              onChange={(e) => p.setAddressStreet(e.target.value)}
              placeholder="Rua, avenida..."
              disabled={locked}
              className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
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
            className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Complemento (opcional)">
            <input
              value={p.addressComplement}
              onChange={(e) => p.setAddressComplement(e.target.value)}
              placeholder="Sala, andar, bloco..."
              className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20"
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
          className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade" required>
          <input
            value={p.city}
            onChange={(e) => p.setCity(e.target.value)}
            placeholder="Rio de Janeiro"
            disabled={locked}
            className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
          />
        </Field>
        <Field label="UF" required>
          <select
            value={p.state}
            onChange={(e) => p.setState(e.target.value)}
            disabled={locked}
            className="h-11 w-full rounded-[10px] border border-input bg-background px-3.5 text-[15px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-70"
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

function Step3Modalidades(p: Step3Props) {
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
        <p className="mt-1 text-[13px] text-muted-foreground">
          Quais esportes seu Klub oferece? Selecione pelo menos uma.
        </p>
      </div>

      {p.sportError ? (
        <p className="text-[13px] text-destructive">{p.sportError}</p>
      ) : p.sports === null ? (
        <p className="text-[13px] text-muted-foreground">Carregando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {p.sports.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => toggleSport(s.code)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
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
          <p className="text-[12.5px] text-muted-foreground">
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
          <p className="text-[12.5px] text-muted-foreground">
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
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
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
        <span className="text-[13.5px] font-semibold">{title}</span>
        {badge ? (
          <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 align-middle text-[9.5px] font-bold uppercase tracking-[0.06em]">
            {badge}
          </span>
        ) : null}
        <span className="block text-[12px] text-muted-foreground">{hint}</span>
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

function Step4Revisao(p: Step4Props) {
  const sportLabels = (p.sports ?? [])
    .filter((s) => p.selectedSports.has(s.code))
    .map((s) => s.name);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Revisão</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
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
          <p className="text-[11px] text-muted-foreground">Auto-preenchido pela Receita.</p>
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
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[12px] text-amber-700 dark:text-amber-400">
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
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5 text-[13.5px]">{children}</div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'green' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-bold uppercase tracking-[0.06em]',
        tone === 'green'
          ? 'bg-[hsl(142_71%_32%/0.12)] text-[hsl(142_71%_32%)]'
          : 'bg-muted text-muted-foreground',
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
      <span className="mb-1.5 block text-[12.5px] font-semibold">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
