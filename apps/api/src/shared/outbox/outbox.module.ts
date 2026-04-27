import { Module } from '@nestjs/common';
import { OutboxProcessorService } from './outbox-processor.service';

/**
 * Outbox processor module — worker que consome OutboxEvents e dispara
 * efeitos colaterais (emails, no PR3). Roda em todas as instâncias da
 * API (Cloud Run pode ter N replicas; SKIP LOCKED evita duplicação).
 */
@Module({
  providers: [OutboxProcessorService],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
