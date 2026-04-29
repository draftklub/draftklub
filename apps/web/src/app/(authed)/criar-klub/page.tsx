'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
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
import { isValidCnpj, isValidCpf, onlyDigits } from '@/lib/format-document';
import { PageHeader } from '@/components/ui/page-header';
import { Banner } from '@/components/ui/banner';
import {
  Stepper,
  Step1Identidade,
  Step2Endereco,
  Step3Modalidades,
  Step4Revisao,
  inferKlubType,
  type Step,
} from './_components';

/**
 * Sprint L PR-L5 — wizard /criar-klub. Refator do monolito (1271 linhas)
 * pra shell magro. Steps individuais migrados pra ./_components.tsx;
 * state continua centralizado aqui pra preservar dados entre steps.
 */
export default function CriarKlubPage() {
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

  const [cnpj, setCnpj] = React.useState('');
  const [cnpjLookupLoading, setCnpjLookupLoading] = React.useState(false);
  const [cnpjLookupData, setCnpjLookupData] = React.useState<CnpjLookupResult | null>(null);
  const [cnpjLookupTried, setCnpjLookupTried] = React.useState(false);

  const [creatorCpf, setCreatorCpf] = React.useState('');

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

  React.useEffect(() => {
    void getMe()
      .then(setMe)
      .catch(() => null);
  }, []);

  // Sprint M batch SM-8 — localStorage draft persistence.
  // Antes: F5 ou nav-away no meio do wizard → perde tudo (aud flagged).
  // Agora: snapshot de todos os campos com debounce 500ms; restore on mount.
  // Limpado em createKlub success (logo antes do redirect).
  const DRAFT_KEY = 'draftklub:create-klub:draft:v1';
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    // Hydration: roda uma vez no mount.
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DRAFT_KEY) : null;
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (typeof d.step === 'number' && d.step >= 1 && d.step <= 4) setStep(d.step as Step);
      if (d.entityType === 'pj' || d.entityType === 'pf') setEntityType(d.entityType);
      if (typeof d.name === 'string') setName(d.name);
      if (typeof d.commonName === 'string') setCommonName(d.commonName);
      if (typeof d.legalName === 'string') setLegalName(d.legalName);
      if (typeof d.type === 'string') setType(d.type as KlubType);
      if (typeof d.email === 'string') setEmail(d.email);
      if (typeof d.phone === 'string') setPhone(d.phone);
      if (typeof d.cnpj === 'string') setCnpj(d.cnpj);
      if (typeof d.creatorCpf === 'string') setCreatorCpf(d.creatorCpf);
      if (typeof d.cep === 'string') setCep(d.cep);
      if (typeof d.addressStreet === 'string') setAddressStreet(d.addressStreet);
      if (typeof d.addressNumber === 'string') setAddressNumber(d.addressNumber);
      if (typeof d.addressComplement === 'string') setAddressComplement(d.addressComplement);
      if (typeof d.addressNeighborhood === 'string') setAddressNeighborhood(d.addressNeighborhood);
      if (typeof d.city === 'string') setCity(d.city);
      if (typeof d.state === 'string') setState(d.state);
      if (typeof d.discoverable === 'boolean') setDiscoverable(d.discoverable);
      if (d.accessMode === 'public' || d.accessMode === 'private') setAccessMode(d.accessMode);
      if (Array.isArray(d.selectedSports)) setSelectedSports(new Set(d.selectedSports as string[]));
    } catch {
      // ignore corrupted draft
    }
  }, []);

  React.useEffect(() => {
    // Save debounced. Não persiste cnpjLookupData/sports catalog (ephemeral).
    if (typeof window === 'undefined') return;
    const id = setTimeout(() => {
      const snapshot = {
        step,
        entityType,
        name,
        commonName,
        legalName,
        type,
        email,
        phone,
        cnpj,
        creatorCpf,
        cep,
        addressStreet,
        addressNumber,
        addressComplement,
        addressNeighborhood,
        city,
        state,
        discoverable,
        accessMode,
        selectedSports: Array.from(selectedSports),
      };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
      } catch {
        // localStorage full / private mode — ignore
      }
    }, 500);
    return () => clearTimeout(id);
  }, [
    step,
    entityType,
    name,
    commonName,
    legalName,
    type,
    email,
    phone,
    cnpj,
    creatorCpf,
    cep,
    addressStreet,
    addressNumber,
    addressComplement,
    addressNeighborhood,
    city,
    state,
    discoverable,
    accessMode,
    selectedSports,
  ]);

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

    if (data.endereco.cep) setCep(onlyDigits(data.endereco.cep));
    if (data.endereco.logradouro) setAddressStreet(data.endereco.logradouro);
    if (data.endereco.numero) setAddressNumber(data.endereco.numero);
    if (data.endereco.bairro) setAddressNeighborhood(data.endereco.bairro);
    if (data.endereco.municipio) setCity(data.endereco.municipio);
    if (data.endereco.uf) setState(data.endereco.uf);
    setAddressSource('cnpj_lookup');

    if (data.razaoSocial) setLegalName(data.razaoSocial);
    setName((prev) => (prev.trim() ? prev : (data.nomeFantasia ?? data.razaoSocial ?? '')));
    if (data.nomeFantasia && data.nomeFantasia !== data.razaoSocial) {
      setCommonName((prev) => (prev.trim() ? prev : (data.nomeFantasia ?? '')));
    }
    if (data.contato.email) setEmail((prev) => prev || (data.contato.email ?? ''));
    if (data.contato.telefone) setPhone((prev) => prev || (data.contato.telefone ?? ''));

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
      // Sprint M batch SM-8 — limpa o draft do localStorage após criar.
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
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
        <PageHeader
          back={{ href: '/home', label: 'Voltar pra Home' }}
          title="Criar Klub"
          description="Cadastre seu Klub na DraftKlub. Vamos validar os dados antes de publicar — leva até 2 dias úteis."
        />

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
            <div className="mt-4">
              <Banner tone="error">{stepError}</Banner>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Próximo
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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
