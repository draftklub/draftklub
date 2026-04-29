import * as crypto from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateConfig } from './bootstrap/config/app.config';
import { FirebaseModule } from './bootstrap/firebase/firebase.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { HealthModule } from './shared/health/health.module';
import { AuthModule } from './shared/auth/auth.module';
import { AuditModule } from './shared/audit/audit.module';
import { EncryptionModule } from './shared/encryption/encryption.module';
import { IdempotencyModule } from './shared/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './shared/idempotency/idempotency.interceptor';
import { EtagModule } from './shared/etag/etag.module';
import { MetricsModule } from './shared/metrics/metrics.module';
import { GeocodingModule } from './shared/geocoding/geocoding.module';
import { LookupModule } from './shared/lookup/lookup.module';
import { EmailModule } from './shared/email/email.module';
import { OutboxModule } from './shared/outbox/outbox.module';
import { IdentityModule } from './modules/identity/identity.module';
import { KlubModule } from './modules/klub/klub.module';
import { SpaceModule } from './modules/space/space.module';
import { SportsModule } from './modules/sports/sports.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { CompetitionModule } from './modules/competition/competition.module';
import { BookingModule } from './modules/booking/booking.module';
import { FeaturesModule } from './modules/features/features.module';

@Module({
  imports: [
    // Sentry primeiro pra interceptar exceptions de outros módulos.
    // forRoot() não recebe DSN — Sentry.init já rodou em instrument.ts.
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      expandVariables: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        // Sprint N batch 1 — Request-ID propagation. Lê x-request-id se
        // veio do client (LB / mobile retry com mesma key); senão gera
        // UUID. Setado em cada log via `req.id` automaticamente, e
        // ecoado no header da response pra debug client-side.
        genReqId(req, res) {
          const incoming =
            (req.headers['x-request-id'] as string | undefined) ??
            (req.headers['x-cloud-trace-context'] as string | undefined);
          const id = incoming ?? crypto.randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        // Sprint M batch 1 + N batch 1 — redact estendido.
        // PII em request bodies (CPF, email, password) não vaza pros logs.
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.documentNumber',
          'req.body.cep',
          'req.body.email',
          '*.password',
          '*.documentNumber',
        ],
        serializers: {
          req(req: { id?: string; method: string; url: string }) {
            return { id: req.id, method: req.method, url: req.url };
          },
        },
      },
    }),
    ScheduleModule.forRoot(),
    // Rate limiting global. Default: 100 req / 60s por IP. Rotas
    // sensíveis (login, role grant, klub.create) podem aplicar
    // @Throttle({ short: { limit: N, ttl: ms } }) em cima desse default.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),
    FirebaseModule,
    AuthModule,
    AuditModule,
    IdempotencyModule,
    EtagModule,
    MetricsModule,
    EncryptionModule,
    GeocodingModule,
    LookupModule,
    EmailModule,
    PrismaModule,
    HealthModule,
    OutboxModule,
    IdentityModule,
    KlubModule,
    SpaceModule,
    SportsModule,
    RankingModule,
    CompetitionModule,
    BookingModule,
    FeaturesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // SentryGlobalFilter captura exceptions não-tratadas e envia pro
    // Sentry mantendo o flow padrão do Nest (re-throw). Coloca antes do
    // ZodExceptionFilter (que é registrado em main.ts via
    // useGlobalFilters); APP_FILTER é avaliado primeiro e não consome.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // Sprint N batch 3 — Idempotency-Key cache (padrão Stripe). No-op
    // sem header. Aplicado globalmente porque qualquer mutation pode
    // chegar com Idempotency-Key vindo de mobile retry.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
