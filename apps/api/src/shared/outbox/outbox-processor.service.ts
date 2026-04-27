import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, type SendEmailResult } from '../email/email.service';
import { renderKlubApprovedEmail } from '../email/templates/klub-review-approved.template';
import { renderKlubRejectedEmail } from '../email/templates/klub-review-rejected.template';
import { renderMembershipRequestCreatedEmail } from '../email/templates/membership-request-created.template';
import { renderMembershipRequestApprovedEmail } from '../email/templates/membership-request-approved.template';
import { renderMembershipRequestRejectedEmail } from '../email/templates/membership-request-rejected.template';

type HandledEventType =
  | 'klub.review.approved'
  | 'klub.review.rejected'
  | 'klub.membership_request.created'
  | 'klub.membership_request.approved'
  | 'klub.membership_request.rejected';

const HANDLED_EVENT_TYPES: HandledEventType[] = [
  'klub.review.approved',
  'klub.review.rejected',
  'klub.membership_request.created',
  'klub.membership_request.approved',
  'klub.membership_request.rejected',
];

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface DispatchPlan {
  recipients: string[];
  rendered: RenderedEmail;
}

/**
 * Worker que consome OutboxEvents e dispara emails. Usa SELECT FOR
 * UPDATE SKIP LOCKED pra coordenar múltiplas instâncias.
 *
 * Backoff: até MAX_ATTEMPTS tentativas; falhas não-retryable marcam
 * direto como `dead`. 5xx/network ficam `pending` com `attempts++`.
 *
 * Sprint C: além de klub.review.* (Sprint D PR3), agora também
 * processa klub.membership_request.{created,approved,rejected}. Pro
 * .created, fanout pra todos KLUB_ADMINs do Klub (geralmente 1 pessoa).
 *
 * Roda a cada 30s. Cron desabilitado em NODE_ENV=test.
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

    const events = await this.prisma.$queryRaw<
      {
        id: string;
        event_type: string;
        payload: Prisma.JsonValue;
        attempts: number;
      }[]
    >(Prisma.sql`
      SELECT id, event_type, payload, attempts
      FROM audit.outbox_events
      WHERE status = 'pending'
        AND event_type = ANY(${HANDLED_EVENT_TYPES}::text[])
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY occurred_at ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `);

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
      const plan = await this.planDispatch(eventType, payload);
      if (!plan || plan.recipients.length === 0) {
        await this.markDead(id, 'no recipients resolved');
        return 'dead';
      }

      // Fan-out: envia individualmente. Em retry pode duplicar pra
      // sucessos parciais, aceitável pro MVP (KLUB_ADMINs costumam ser 1).
      const results = await Promise.all(
        plan.recipients.map((to) =>
          this.email.send({
            to,
            subject: plan.rendered.subject,
            html: plan.rendered.html,
            text: plan.rendered.text,
          }),
        ),
      );

      const allOk = results.every((r) => r.ok);
      if (allOk) {
        await this.markSent(id);
        return 'sent';
      }

      const firstFailure = results.find((r): r is Extract<SendEmailResult, { ok: false }> => !r.ok);
      if (firstFailure && !firstFailure.retryable) {
        await this.markDead(id, firstFailure.error);
        return 'dead';
      }
      await this.markRetry(id, firstFailure?.error ?? 'unknown');
      return 'failed';
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Outbox event ${id} threw: ${msg}`);
      await this.markRetry(id, msg);
      return 'failed';
    }
  }

  private async planDispatch(
    eventType: HandledEventType,
    payload: Prisma.JsonObject,
  ): Promise<DispatchPlan | null> {
    if (eventType === 'klub.review.approved') {
      const recipient = await this.resolveUserEmail(this.str(payload, 'createdById'));
      if (!recipient) return null;
      return {
        recipients: [recipient],
        rendered: renderKlubApprovedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: this.str(payload, 'klubSlug') ?? '',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'klub.review.rejected') {
      const recipient = await this.resolveUserEmail(this.str(payload, 'createdById'));
      if (!recipient) return null;
      return {
        recipients: [recipient],
        rendered: renderKlubRejectedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          reason: this.str(payload, 'reason') ?? 'Sem motivo registrado.',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'klub.membership_request.created') {
      const klubId = this.str(payload, 'klubId');
      const userId = this.str(payload, 'userId');
      if (!klubId || !userId) return null;
      const [admins, applicant, request] = await Promise.all([
        this.resolveKlubAdminEmails(klubId),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true },
        }),
        // Re-pesca a request pra ler message — payload do outbox não inclui.
        this.prisma.membershipRequest.findUnique({
          where: { id: this.str(payload, 'requestId') ?? '' },
          select: { message: true },
        }),
      ]);
      if (admins.length === 0) return null;
      const klubSlug = await this.resolveKlubSlug(klubId);
      return {
        recipients: admins,
        rendered: renderMembershipRequestCreatedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: klubSlug ?? '',
          applicantName: applicant?.fullName ?? 'Um jogador',
          message: request?.message ?? '(sem mensagem)',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'klub.membership_request.approved') {
      const recipient = await this.resolveUserEmail(this.str(payload, 'userId'));
      if (!recipient) return null;
      return {
        recipients: [recipient],
        rendered: renderMembershipRequestApprovedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: this.str(payload, 'klubSlug') ?? '',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'klub.membership_request.rejected') {
      const recipient = await this.resolveUserEmail(this.str(payload, 'userId'));
      if (!recipient) return null;
      return {
        recipients: [recipient],
        rendered: renderMembershipRequestRejectedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          reason: this.str(payload, 'reason') ?? 'Sem motivo registrado.',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    return null;
  }

  private async resolveUserEmail(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  private async resolveKlubAdminEmails(klubId: string): Promise<string[]> {
    const admins = await this.prisma.roleAssignment.findMany({
      where: { scopeKlubId: klubId, role: 'KLUB_ADMIN' },
      select: { user: { select: { email: true } } },
    });
    return admins.map((a) => a.user.email).filter((e): e is string => !!e);
  }

  private async resolveKlubSlug(klubId: string): Promise<string | null> {
    const k = await this.prisma.klub.findUnique({
      where: { id: klubId },
      select: { slug: true },
    });
    return k?.slug ?? null;
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
