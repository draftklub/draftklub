import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { validateConfig } from './bootstrap/config/worker.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        transport:
          process.env['NODE_ENV'] === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
  ],
})
export class WorkerModule {}
