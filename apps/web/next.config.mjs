import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone gera node_modules minificado em .next/standalone — usado
  // pelo Dockerfile multi-stage pra reduzir imagem de ~800MB pra ~150MB.
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  async headers() {
    // Headers de segurança aplicados a todas as rotas. CSP propriamente
    // configurada (com nonce + allowlist de Firebase/APIs) ficou pra
    // sprint dedicada — exige middleware com nonce-per-request pra não
    // quebrar inline scripts do Next 15 + React 19.
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
      },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// withSentryConfig só ativa upload de source maps quando SENTRY_AUTH_TOKEN
// é fornecido em build-time. Sem auth token, vira no-op funcional —
// runtime Sentry continua sendo controlado por SENTRY_DSN /
// NEXT_PUBLIC_SENTRY_DSN nos arquivos sentry.*.config.ts.
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? 'draftklub-web',
  // Disabled by default — habilitar quando tivermos SENTRY_AUTH_TOKEN
  // em Cloud Build pra source maps upload.
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
