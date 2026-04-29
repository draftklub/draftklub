import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint N batch 3 — limpeza diária de idempotency keys expiradas.
 *
 * Roda às 3:17 (off-hour BR), apaga rows com expires_at < NOW() em
 * batch único. Index em expires_at deixa o DELETE rápido mesmo com
 * milhões de rows. Sem este job, a tabela cresce indefinidamente.
 */
@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('17 3 * * *', { name: 'idempotency-cleanup' })
  async cleanup(): Promise<void> {
    try {
      const result = await this.prisma.idempotencyKey.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`Idempotency cleanup: removed ${result.count} expired keys`);
      }
    } catch (err) {
      this.logger.error(
        `Idempotency cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  // Exported for tests / manual maintenance.
  cron = CronExpression.EVERY_DAY_AT_MIDNIGHT;
}
