import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateConfig } from './bootstrap/config/app.config';
import { FirebaseModule } from './bootstrap/firebase/firebase.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { HealthModule } from './shared/health/health.module';
import { AuthModule } from './shared/auth/auth.module';
import { EncryptionModule } from './shared/encryption/encryption.module';
import { IdentityModule } from './modules/identity/identity.module';
import { KlubModule } from './modules/klub/klub.module';
import { SportsModule } from './modules/sports/sports.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { CompetitionModule } from './modules/competition/competition.module';

@Module({
  imports: [
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
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req(req: { method: string; url: string }) {
            return { method: req.method, url: req.url };
          },
        },
      },
    }),
    FirebaseModule,
    AuthModule,
    EncryptionModule,
    PrismaModule,
    HealthModule,
    IdentityModule,
    KlubModule,
    SportsModule,
    RankingModule,
    CompetitionModule,
  ],
})
export class AppModule {}
