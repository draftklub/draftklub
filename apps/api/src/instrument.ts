/**
 * Sentry init. Importado como PRIMEIRA coisa em main.ts, antes de
 * qualquer outro require do Nest, pra que o auto-instrumentation
 * (HTTP, Prisma, Fastify, etc.) consiga interceptar os imports.
 *
 * Sem SENTRY_DSN definido, init é no-op e a aplicação roda normal.
 * Em prod, DSN vem do Secret Manager via Cloud Run --set-secrets.
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.COMMIT_SHA,
    integrations: [nodeProfilingIntegration()],
    // Sample 10% das transações por padrão. Ajustar via env conforme
    // o budget de eventos no plano Sentry.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),
  });
}
