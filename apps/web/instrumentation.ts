/**
 * Next.js instrumentation hook (15.x). Carrega o config Sentry do
 * runtime correto (Node.js ou Edge). Necessário pra que o init rode
 * no início do request lifecycle do servidor.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
