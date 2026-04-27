import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { renderKlubApprovedEmail } from '../email/templates/klub-review-approved.template';
import { renderKlubRejectedEmail } from '../email/templates/klub-review-rejected.template';

type HandledEventType = 'klub.review.approved' | 'klub.review.rejected';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

/**
 * Sprint D PR3 — worker que consome OutboxEvents e dispara emails de
 * aprovação/rejeição pra criadores de Klubs. Usa SELECT...FOR UPDATE
 * SKIP LOCKED pra coordenar múltiplos workers (Cloud Run pode ter N
 * instâncias rodando o mesmo cron).
 *
 * Backoff: até MAX_ATTEMPTS tentativas; falhas não-retryable (4xx do
 * Resend) marcam direto como `dead`. 5xx/network ficam `pending` com
 * `attempts++` e voltam pro próximo ciclo.
 *
 * Roda a cada 30s. Cron desabilitado em test/CI via NODE_ENV check.
 */
@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private readonly appBaseUrl: string;
  private readonly enabled: boolean;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.appBaseUrl = config.get<string>('APP_BASE_URL') ?? 'https://draftklub.com';
    const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
    this.enabled = nodeEnv !== 'test';
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processOutbox(): Promise<void> {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      await this.processBatch();
    } finally {
      this.running = false;
    }
  }

  /** Exposto pra tests + endpoints admin chamarem manualmente. */
  async processBatch(): Promise<{ processed: number; sent: number; failed: number }> {
    let processed = 0;
    let sent = 0;
    let failed = 0;

    // Locking: pega só eventos que essa instância consegue lock exclusivo.
    // Em modo single-instance Cloud Run não importa; em múltiplas
    // instâncias evita disparar email duplicado.
    const events = await this.prisma.$queryRaw<
      {
        id: string;
        event_type: string;
        payload: Prisma.JsonValue;
        attempts: number;
      }[]
    >`
      SELECT id, event_type, payload, attempts
      FROM audit.outbox_events
      WHERE status = 'pending'
        AND event_type IN ('klub.review.approved', 'klub.review.rejected')
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY occurred_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `;

    for (const event of events) {
      processed++;
      const result = await this.handleEvent(
        event.id,
        event.event_type as HandledEventType,
        event.payload as Prisma.JsonObject,
      );
      if (result === 'sent') sent++;
      else if (result === 'failed') failed++;
    }

    if (processed > 0) {
      this.logger.log(`Outbox: processed=${processed} sent=${sent} failed=${failed}`);
    }

    return { processed, sent, failed };
  }

  private async handleEvent(
    id: string,
    eventType: HandledEventType,
    payload: Prisma.JsonObject,
  ): Promise<'sent' | 'failed' | 'dead'> {
    try {
      const recipient = await this.resolveRecipientEmail(payload);
      if (!recipient) {
        // Sem email do criador (user deletado?) — marca como dead.
        await this.markDead(id, 'recipient unresolved');
        return 'dead';
      }

      const rendered =
        eventType === 'klub.review.approved'
          ? renderKlubApprovedEmail({
              klubName: this.str(payload, 'klubName') ?? 'seu Klub',
              klubSlug: this.str(payload, 'klubSlug') ?? '',
              appBaseUrl: this.appBaseUrl,
            })
          : renderKlubRejectedEmail({
              klubName: this.str(payload, 'klubName') ?? 'seu Klub',
              reason: this.str(payload, 'reason') ?? 'Sem motivo registrado.',
              appBaseUrl: this.appBaseUrl,
            });

      const result = await this.email.send({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (result.ok) {
        await this.markSent(id);
        return 'sent';
      }

      if (!result.retryable) {
        await this.markDead(id, result.error);
        return 'dead';
      }

      await this.markRetry(id, result.error);
      return 'failed';
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Outbox event ${id} threw: ${msg}`);
      await this.markRetry(id, msg);
      return 'failed';
    }
  }

  private async resolveRecipientEmail(payload: Prisma.JsonObject): Promise<string | null> {
    const createdById = this.str(payload, 'createdById');
    if (!createdById) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  private str(obj: Prisma.JsonObject, key: string): string | null {
    const v = obj[key];
    return typeof v === 'string' ? v : null;
  }

  private async markSent(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }

  private async markRetry(id: string, error: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE audit.outbox_events
      SET attempts = attempts + 1,
          last_error = ${error.slice(0, 500)},
          status = CASE WHEN attempts + 1 >= ${MAX_ATTEMPTS} THEN 'dead' ELSE 'pending' END
      WHERE id = ${id}::uuid
    `;
  }

  private async markDead(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'dead', lastError: error.slice(0, 500) },
    });
  }
}
