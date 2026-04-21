import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { execSync } from 'node:child_process';
import { AppModule } from './app.module';
import { initTelemetry, shutdownTelemetry } from './bootstrap/telemetry/otel';

async function runMigrations(): Promise<void> {
  execSync('./node_modules/.bin/prisma migrate deploy', { stdio: 'inherit' });
}

async function bootstrap(): Promise<void> {
  const serviceName = process.env['OTEL_SERVICE_NAME'] ?? 'draftklub-api';
  const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
  initTelemetry(serviceName, otlpEndpoint);

  await runMigrations();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exitCode = 1;
});

process.on('SIGTERM', async () => {
  await shutdownTelemetry();
});
