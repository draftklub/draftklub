import * as http from 'http';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  logger.log('Worker started', 'Worker');

  const port = parseInt(process.env.PORT ?? '8080', 10);
  http.createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(port);
  logger.log(`Worker HTTP health server listening on port ${port}`, 'Worker');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during worker bootstrap:', err);
  process.exitCode = 1;
});
