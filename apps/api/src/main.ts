import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { execSync } from 'node:child_process';
import { AppModule } from './app.module';
import { initTelemetry, shutdownTelemetry } from './bootstrap/telemetry/otel';
import { ZodExceptionFilter } from './shared/filters/zod-exception.filter';
import { getCorsOrigins } from './bootstrap/config/app.config';

function runMigrations(): void {
  execSync('./node_modules/.bin/prisma migrate deploy', { stdio: 'inherit' });
}

async function bootstrap(): Promise<void> {
  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'draftklub-api';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  initTelemetry(serviceName, otlpEndpoint);

  runMigrations();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new ZodExceptionFilter());

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    maxAge: 600,
  });

  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exitCode = 1;
});

process.on('SIGTERM', () => {
  shutdownTelemetry().catch((err: unknown) => {
    console.error('Error during telemetry shutdown:', err);
  });
});
