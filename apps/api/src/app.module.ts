import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateConfig } from './bootstrap/config/app.config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { HealthModule } from './shared/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      expandVariables: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] === 'development'
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
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
