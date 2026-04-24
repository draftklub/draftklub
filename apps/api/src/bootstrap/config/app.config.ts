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
