import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PolicyGuard } from '../auth/policy.guard';
import { RequirePolicy } from '../auth/require-policy.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint Polish PR-E — endpoint admin pra inspecionar OutboxEvents
 * recentes. Útil pra validar que crons (e.g. `booking.reminder_24h`)
 * estão emitindo eventos e os emails saíram. SUPER_ADMIN-only via
 * action `outbox.read` (sem regra no PolicyEngine, então só SUPER_ADMIN
 * bypassa).
 */
const ListQuerySchema = z.object({
  eventType: z.string().max(100).optional(),
  status: z.enum(['pending', 'sent', 'dead']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  freshnessHours: z.coerce.number().int().min(1).max(720).default(48),
});

interface OutboxRow {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  occurred_at: Date;
  sent_at: Date | null;
  last_error: string | null;
  payload: Prisma.JsonValue;
}

@Controller('admin/outbox')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class AdminOutboxController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('recent')
  @RequirePolicy('outbox.read')
  async recent(@Query() query: unknown) {
    const dto = ListQuerySchema.parse(query);
    const cutoff = new Date(Date.now() - dto.freshnessHours * 3_600_000);

    const conditions: Prisma.Sql[] = [Prisma.sql`occurred_at >= ${cutoff}`];
    if (dto.eventType) conditions.push(Prisma.sql`event_type = ${dto.eventType}`);
    if (dto.status) conditions.push(Prisma.sql`status = ${dto.status}`);
    const where = Prisma.join(conditions, ' AND ');

    const rows = await this.prisma.$queryRaw<OutboxRow[]>(Prisma.sql`
      SELECT id, event_type, status, attempts, occurred_at, sent_at, last_error, payload
      FROM audit.outbox_events
      WHERE ${where}
      ORDER BY occurred_at DESC
      LIMIT ${dto.limit}
    `);

    const summary = {
      total: rows.length,
      byStatus: rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {}),
      byEventType: rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.event_type] = (acc[r.event_type] ?? 0) + 1;
        return acc;
      }, {}),
    };

    return {
      summary,
      events: rows.map((r) => ({
        id: r.id,
        eventType: r.event_type,
        status: r.status,
        attempts: r.attempts,
        occurredAt: r.occurred_at.toISOString(),
        sentAt: r.sent_at?.toISOString() ?? null,
        lastError: r.last_error,
        payload: r.payload,
      })),
    };
  }
}
