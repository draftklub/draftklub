import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_SERVICE_NAME: z.string().default('draftklub-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(64).optional(),
  CORS_ORIGINS: z.string().optional(),
  // CSV de origens permitidas. Default desenvolvido em getCorsOrigins().

  // Sprint D PR3 — email infra (Resend). Opcional: sem chave, EmailService
  // cai em modo log-only (útil pra dev).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Base URL pra links nos emails (ex: https://draftklub.com).
  APP_BASE_URL: z.string().url().optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(`Config validation failed:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}

/**
 * Resolve a lista de origens CORS a partir de env var (CSV).
 * Defaults seguros por ambiente:
 *   - dev: localhost:3001 (Next dev) + 127.0.0.1
 *   - staging: staging.draftklub.com
 *   - production: draftklub.com + www. + draftklub.com.br + www.
 */
export function getCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const csv = env.CORS_ORIGINS?.trim();
  if (csv) {
    return csv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') {
    return [
      'https://draftklub.com',
      'https://www.draftklub.com',
      'https://draftklub.com.br',
      'https://www.draftklub.com.br',
    ];
  }
  if (nodeEnv === 'staging') {
    return ['https://staging.draftklub.com', 'https://app-staging.draftklub.com'];
  }
  // development / test
  return ['http://localhost:3001', 'http://127.0.0.1:3001'];
}
