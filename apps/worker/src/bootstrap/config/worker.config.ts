import { z } from 'zod';

export const workerConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PUBSUB_PROJECT_ID: z.string().optional(),
});

export type WorkerConfig = z.infer<typeof workerConfigSchema>;

export function validateConfig(config: Record<string, unknown>): WorkerConfig {
  const result = workerConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Worker config validation failed:\n${JSON.stringify(result.error.flatten().fieldErrors, null, 2)}`,
    );
  }
  return result.data;
}
