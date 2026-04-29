import Link from 'next/link';
import { BrandLockup } from '@/components/brand/brand-lockup';
import { CourtPattern } from '@/components/brand/court-pattern';
import { LoginForm } from '@/components/login/login-form';
import { RedirectIfAuthenticated } from '@/components/auth-guard';

/**
 * DraftKlub Login — responsivo, 3 tratamentos.
 *
 * - Mobile (<768px): stack vertical, gradient background→secondary, glows
 *   decorativos verde/terracota nos cantos. Form 320px.
 * - Tablet (768px+): mesmo layout vertical com mais respiração + form
 *   ancorado em card branco (480px).
 * - Desktop (1024px+): two-column split — hero verde escuro 56% (com
 *   CourtPattern e tagline 64px) + form 44% à direita.
 *
 * Tagline canon: "Onde o Klub acontece."
 * Microcopy: PT-BR esportivo profissional. Sem signup público.
 */
export default function LoginPage() {
  return (
    <main className="min-h-screen lg:flex">
      <RedirectIfAuthenticated to="/home" />
      {/* ───── Hero (somente desktop) ───────────────────────────── */}
      <section
        className="relative hidden overflow-hidden text-white lg:flex lg:basis-[56%] lg:flex-col lg:justify-between"
        style={{
          padding: '56px 64px',
          background: `
            radial-gradient(900px 600px at 80% 100%, hsl(var(--brand-primary-600)) 0%, transparent 60%),
            radial-gradient(700px 500px at 0% 0%, hsl(var(--brand-primary-700)) 0%, transparent 55%),
            linear-gradient(160deg, hsl(var(--brand-primary-800)) 0%, hsl(var(--brand-primary-900)) 100%)
          `,
        }}
      >
        <CourtPattern opacity={0.16} />

        {/* Linha terracota → âmbar no topo */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg, hsl(var(--brand-secondary-500)) 0%, hsl(var(--brand-accent-500)) 50%, transparent 100%)',
          }}
        />

        <div className="relative z-10">
          <BrandLockup size="lg" tone="light" />
        </div>

        <div className="relative z-10 max-w-130">
          <p
            className="mb-5 font-mono text-xs font-medium uppercase"
            style={{
              letterSpacing: '0.18em',
              color: 'hsl(var(--brand-primary-200))',
            }}
          >
            Para clubes de tênis · padel · squash · beach tênis
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(44px, 4.4vw, 64px)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              fontWeight: 700,
              textWrap: 'balance',
            }}
          >
            Onde o <span style={{ color: 'hsl(var(--brand-primary-300))' }}>Klub</span>
            <br />
            acontece.
          </h1>
          <p
            className="mt-5 max-w-115 text-lg"
            style={{
              lineHeight: 1.55,
              color: 'hsl(var(--brand-primary-100) / 0.75)',
              textWrap: 'pretty',
            }}
          >
            Reservas, rankings, torneios e a vida do Klub — tudo num lugar só. Feito pelos Klubs,
            para os Klubs brasileiros.
          </p>
        </div>

        <div
          className="relative z-10 flex items-end justify-between font-mono text-xs"
          style={{ color: 'hsl(var(--brand-primary-200) / 0.7)' }}
        >
          <span>© DraftKlub 2026</span>
          <span>v1.0</span>
        </div>
      </section>

      {/* ───── Form (mobile-first; vira coluna direita no desktop) ── */}
      <section
        className="relative flex min-h-screen flex-1 flex-col justify-center overflow-hidden lg:min-h-0 lg:basis-[44%]"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary)) 100%)',
        }}
      >
        {/* Glows decorativos (mobile/tablet apenas) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-32 h-70 w-70 rounded-full lg:hidden"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.10) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full lg:hidden"
          style={{
            background: 'radial-gradient(circle, hsl(var(--accent) / 0.07) 0%, transparent 70%)',
          }}
        />

        {/* Brand + tagline (mobile/tablet) */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 pt-16 md:gap-8 md:pt-24 lg:hidden">
          <BrandLockup size="lg" className="md:hidden" />
          <BrandLockup size="xl" className="hidden md:inline-flex" />
          <p
            className="text-center font-display font-semibold text-foreground"
            style={{
              fontSize: '22px',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              textWrap: 'balance',
            }}
          >
            Onde o <span className="text-primary">Klub</span> acontece.
          </p>
        </div>

        {/* Form area */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-4 pt-7 md:pt-12 lg:px-16 lg:py-14">
          {/* Desktop heading + form */}
          <div className="hidden w-full max-w-100 lg:block">
            <h2
              className="mb-1 font-display text-3xl font-bold text-foreground"
              style={{ letterSpacing: '-0.02em' }}
            >
              Acesse sua conta
            </h2>
            <p className="mb-7 text-sm text-muted-foreground">Entre com e-mail ou Google.</p>
            <LoginForm formWidth="100%" />
            <div className="mt-8 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              Sem conta?{' '}
              <Link
                href="/criar-conta"
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                Criar conta
              </Link>
            </div>
          </div>

          {/* Mobile/Tablet form */}
          <div className="w-full lg:hidden">
            {/* Mobile: form direto, sem card */}
            <div className="mx-auto flex justify-center md:hidden">
              <LoginForm formWidth={320} />
            </div>
            {/* Tablet: card branco com sombra */}
            <div
              className="mx-auto hidden rounded-2xl border border-border bg-card md:block"
              style={{
                width: 'min(100%, 480px)',
                padding: '36px 40px',
                boxShadow: '0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -12px rgb(0 0 0 / 0.10)',
              }}
            >
              <LoginForm formWidth="100%" />
            </div>
          </div>
        </div>

        {/* Footer (mobile/tablet) */}
        <div className="relative z-10 px-6 pb-7 text-center text-sm text-muted-foreground md:pb-10 md:text-sm lg:hidden">
          Sem conta?{' '}
          <Link
            href="/criar-conta"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Criar conta
          </Link>
        </div>
      </section>
    </main>
  );
}
