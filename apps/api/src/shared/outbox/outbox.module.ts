import { Module } from '@nestjs/common';
import { IdentityModule } from '../../modules/identity/identity.module';
import { OutboxProcessorService } from './outbox-processor.service';
import { AdminOutboxController } from './admin-outbox.controller';

/**
 * Outbox processor module — worker que consome OutboxEvents e dispara
 * efeitos colaterais (emails, no PR3). Roda em todas as instâncias da
 * API (Cloud Run pode ter N replicas; SKIP LOCKED evita duplicação).
 *
 * AdminOutboxController expõe inspeção dos eventos recentes pra
 * SUPER_ADMIN debugar crons em prod.
 */
@Module({
  imports: [IdentityModule],
  controllers: [AdminOutboxController],
  providers: [OutboxProcessorService],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
