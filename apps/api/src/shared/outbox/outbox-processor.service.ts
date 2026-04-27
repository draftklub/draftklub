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
import { renderBookingConfirmedEmail } from '../email/templates/booking-confirmed.template';
import { renderBookingCancelledEmail } from '../email/templates/booking-cancelled.template';
import { renderBookingReminderEmail } from '../email/templates/booking-reminder.template';

type HandledEventType =
  | 'klub.review.approved'
  | 'klub.review.rejected'
  | 'klub.membership_request.created'
  | 'klub.membership_request.approved'
  | 'klub.membership_request.rejected'
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.reminder_24h';

const HANDLED_EVENT_TYPES: HandledEventType[] = [
  'klub.review.approved',
  'klub.review.rejected',
  'klub.membership_request.created',
  'klub.membership_request.approved',
  'klub.membership_request.rejected',
  'booking.created',
  'booking.cancelled',
  'booking.reminder_24h',
];

const REMINDER_WINDOW_HOURS_MIN = 23;
const REMINDER_WINDOW_HOURS_MAX = 25;
const REMINDER_BATCH_SIZE = 50;

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

  /**
   * Sprint Polish PR-A — escaneia bookings 24h antes do startsAt e
   * cria OutboxEvent `booking.reminder_24h`. Roda a cada 5min — janela
   * de 2h ([+23h, +25h]) cobre o gap entre execuções sem duplicar.
   *
   * Atomic: update de `reminderSentAt` + insert do OutboxEvent na mesma
   * transação previne dupla emissão se o cron rodar em 2 instâncias.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scanReminders(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.scanRemindersBatch();
    } catch (err) {
      this.logger.error(`scanReminders failed: ${(err as Error).message}`);
    }
  }

  /** Exposto pra tests chamarem manualmente. */
  async scanRemindersBatch(): Promise<{ scheduled: number }> {
    const now = Date.now();
    const windowStart = new Date(now + REMINDER_WINDOW_HOURS_MIN * 3_600_000);
    const windowEnd = new Date(now + REMINDER_WINDOW_HOURS_MAX * 3_600_000);

    const candidates = await this.prisma.booking.findMany({
      where: {
        startsAt: { gte: windowStart, lte: windowEnd },
        status: 'confirmed',
        reminderSentAt: null,
        deletedAt: null,
      },
      select: {
        id: true,
        klubId: true,
        spaceId: true,
        primaryPlayerId: true,
        startsAt: true,
        endsAt: true,
        matchType: true,
      },
      take: REMINDER_BATCH_SIZE,
    });

    if (candidates.length === 0) return { scheduled: 0 };

    let scheduled = 0;
    for (const b of candidates) {
      try {
        // Tx por booking — falha de um não bloqueia outros, e UPDATE
        // com WHERE reminderSentAt IS NULL impede reemissão se outra
        // instância pegou esse booking primeiro.
        const result = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.booking.updateMany({
            where: { id: b.id, reminderSentAt: null },
            data: { reminderSentAt: new Date() },
          });
          if (updated.count === 0) return null; // perdemos a corrida
          const [klub, space] = await Promise.all([
            tx.klub.findUnique({
              where: { id: b.klubId },
              select: { name: true, slug: true },
            }),
            tx.space.findUnique({
              where: { id: b.spaceId },
              select: { name: true },
            }),
          ]);
          return tx.outboxEvent.create({
            data: {
              eventType: 'booking.reminder_24h',
              payload: {
                bookingId: b.id,
                klubId: b.klubId,
                klubName: klub?.name ?? '',
                klubSlug: klub?.slug ?? '',
                spaceName: space?.name ?? '',
                startsAt: b.startsAt.toISOString(),
                endsAt: b.endsAt?.toISOString() ?? null,
                primaryPlayerId: b.primaryPlayerId,
                matchType: b.matchType ?? 'singles',
              },
            },
          });
        });
        if (result) scheduled++;
      } catch (err) {
        this.logger.warn(
          `scanReminders: booking ${b.id} skipped — ${(err as Error).message}`,
        );
      }
    }

    if (scheduled > 0) {
      this.logger.log(`Reminders scheduled: ${scheduled}/${candidates.length}`);
    }
    return { scheduled };
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
    if (eventType === 'booking.created') {
      // Só envia email pra bookings já confirmados; pendentes (workflow
      // staff_approval) ainda não têm template próprio — Sprint posterior.
      const status = this.str(payload, 'status');
      if (status !== 'confirmed') return null;
      const recipients = await this.resolveBookingRecipients(this.str(payload, 'bookingId'));
      if (recipients.length === 0) return null;
      return {
        recipients,
        rendered: renderBookingConfirmedEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: this.str(payload, 'klubSlug') ?? '',
          spaceName: this.str(payload, 'spaceName') ?? 'a quadra',
          startsAt: this.str(payload, 'startsAt') ?? new Date().toISOString(),
          endsAt: this.str(payload, 'endsAt'),
          matchType: this.str(payload, 'matchType') ?? 'singles',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'booking.cancelled') {
      const primaryPlayerId = this.str(payload, 'primaryPlayerId');
      const cancelledById = this.str(payload, 'cancelledById');
      const recipients = await this.resolveBookingRecipients(this.str(payload, 'bookingId'));
      if (recipients.length === 0) return null;
      const cancelledBySelf = primaryPlayerId === cancelledById;
      const cancelledByIsStaffRaw = payload.cancelledByIsStaff;
      const cancelledByIsStaff =
        typeof cancelledByIsStaffRaw === 'boolean' ? cancelledByIsStaffRaw : false;
      return {
        recipients,
        rendered: renderBookingCancelledEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: this.str(payload, 'klubSlug') ?? '',
          spaceName: this.str(payload, 'spaceName') ?? 'a quadra',
          startsAt: this.str(payload, 'startsAt') ?? new Date().toISOString(),
          cancelledByIsStaff,
          cancelledBySelf,
          reason: this.str(payload, 'reason'),
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    if (eventType === 'booking.reminder_24h') {
      const recipients = await this.resolveBookingRecipients(this.str(payload, 'bookingId'));
      if (recipients.length === 0) return null;
      return {
        recipients,
        rendered: renderBookingReminderEmail({
          klubName: this.str(payload, 'klubName') ?? 'seu Klub',
          klubSlug: this.str(payload, 'klubSlug') ?? '',
          spaceName: this.str(payload, 'spaceName') ?? 'a quadra',
          startsAt: this.str(payload, 'startsAt') ?? new Date().toISOString(),
          endsAt: this.str(payload, 'endsAt'),
          matchType: this.str(payload, 'matchType') ?? 'singles',
          appBaseUrl: this.appBaseUrl,
        }),
      };
    }
    return null;
  }

  /**
   * Sprint Polish PR-A — fan-out de email pro primary player + outros
   * players com userId (guests sem User registrado são ignorados).
   * Re-fetch do booking pelo bookingId pra dado fresh de otherPlayers
   * (payload do outbox pode estar stale se reservas mudaram).
   */
  private async resolveBookingRecipients(bookingId: string | null): Promise<string[]> {
    if (!bookingId) return [];
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { primaryPlayerId: true, otherPlayers: true },
    });
    if (!booking) return [];

    const userIds = new Set<string>();
    if (booking.primaryPlayerId) userIds.add(booking.primaryPlayerId);
    const others = (booking.otherPlayers as { userId?: string }[] | null) ?? [];
    for (const p of others) {
      if (p.userId && typeof p.userId === 'string') userIds.add(p.userId);
    }
    if (userIds.size === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { email: true },
    });
    return users.map((u) => u.email).filter((e): e is string => !!e);
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
