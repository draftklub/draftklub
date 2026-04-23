import * as http from 'http';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  // HTTP server sobe PRIMEIRO — Cloud Run exige resposta rápida na porta
  const port = parseInt(process.env.PORT ?? '8080', 10);
  const server = http.createServer((_, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`Worker HTTP health server listening on port ${port}`);

  // Depois inicializa o contexto Nest
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);
  logger.log('Worker started', 'Worker');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during worker bootstrap:', err);
  process.exitCode = 1;
});
