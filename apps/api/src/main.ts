// Sentry instrumentation MUST be the first import — pre-loads o
// auto-instrument antes de qualquer require de framework.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
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

  // Sprint N batch 2 — OpenAPI/Swagger UI em /api/docs.
  // patchNestJsSwagger ensina o gerador do Swagger a entender Zod schemas
  // (via classes geradas por createZodDto). Sem isso, schemas ficam
  // como `{}` no spec.
  // Default: habilitado em dev/staging, desabilitado em prod (controla
  // exposição da spec). Override via SWAGGER_ENABLED=true em prod
  // se quiser publicar a doc (DraftKlub provavelmente vai querer pra
  // integradores futuros — flip quando estiver pronto).
  const swaggerEnabled = process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DraftKlub API')
      .setDescription(
        'API REST do DraftKlub — gestão de Klubs esportivos, reservas, torneios, ranking. Auth via Bearer Firebase ID token. ' +
          'Schemas de request body são validados via Zod no controller (212 schemas em src/modules/*/api/dtos/). Conversão pra createZodDto pra renderizar no spec é incremental — controllers que já usam createZodDto aparecem com schema completo aqui.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Firebase ID token',
          description: 'Firebase ID token via Bearer header.',
        },
        'firebase',
      )
      .addServer(process.env.APP_BASE_URL ?? 'http://localhost:3000', 'Current')
      .build();
    const rawDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
    });
    // cleanupOpenApiDoc remove refs sobrando dos createZodDto + ajusta
    // schemas pra spec válido. Para controllers que ainda usam Body() unknown
    // não muda nada (já estavam vazios).
    const document = cleanupOpenApiDoc(rawDocument);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

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
