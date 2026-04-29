import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { initTelemetry, shutdownTelemetry } from './bootstrap/telemetry/otel';
import { ZodExceptionFilter } from './shared/filters/zod-exception.filter';
import { getCorsOrigins } from './bootstrap/config/app.config';

async function bootstrap(): Promise<void> {
  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'draftklub-api';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  initTelemetry(serviceName, otlpEndpoint);

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

  // Security headers via Fastify Helmet. API só serve JSON, então CSP é
  // restritiva — sem inline scripts, sem origens externas. HSTS de 1 ano.
  // Frame-ancestors none (defesa em profundidade contra clickjacking,
  // mesmo a API não tendo HTML).
  // Cast: @fastify/helmet 13 traz tipos do fastify 5.8.4, projeto roda
  // 5.8.5 — divergência tipográfica de DecorationMethod sem impacto em
  // runtime. Em runtime tudo funciona.
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

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
