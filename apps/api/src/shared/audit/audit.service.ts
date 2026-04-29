import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint M batch 7 — registro de eventos de segurança.
 *
 * Uso típico em handlers sensíveis (role grant/revoke, klub admin
 * transfer, aprovações admin, cancelamentos):
 *
 *   await this.audit.record({
 *     actorId: cmd.actorId,
 *     action: 'role.granted',
 *     targetType: 'role',
 *     targetId: roleAssignment.id,
 *     after: { role, scopeKlubId, scopeSportId, granteeUserId },
 *   });
 *
 * Falhas são logadas mas NÃO propagadas — registro de auditoria é
 * fire-and-forget pra não quebrar a operação de negócio. Em prod, um
 * alert policy em "audit log creation rate suddenly = 0" cobre detecção
 * de regressão silenciosa (TODO sprint futura).
 */
export interface RecordSecurityEventInput {
  /** Quem fez. Null = sistema/cron/migração. */
  actorId?: string | null;
  /** Tipo do recurso afetado: 'role' | 'klub' | 'booking' | etc. */
  targetType: string;
  /** PK do recurso afetado quando aplicável. */
  targetId?: string | null;
  /** Ação canônica em namespace.dotted: 'role.granted', 'klub.admin.transferred'. */
  action: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordSecurityEventInput): Promise<void> {
    try {
      await this.prisma.securityEvent.create({
        data: {
          actorId: input.actorId ?? null,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          action: input.action,
          before: input.before,
          after: input.after,
          metadata: input.metadata,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record security event ${input.action}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
