import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditService } from '../../../../shared/audit/audit.service';

export interface RecordConsentCommand {
  userId: string;
  version: string;
}

/**
 * Sprint M batch 8 — registra aceite LGPD do User.
 *
 * Persiste `consentGivenAt = now()` e `consentVersion` (ex: '2026-04-29-v1').
 * Versionamento é importante: se a política mudar, o User precisa
 * re-aceitar — comparar com a versão atual no app e disparar prompt.
 *
 * Não bloqueia se já aceitou — sobrescreve com a versão nova (renew).
 */
@Injectable()
export class RecordConsentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async execute(cmd: RecordConsentCommand): Promise<{ consentGivenAt: string; version: string }> {
    const now = new Date();
    try {
      await this.prisma.user.update({
        where: { id: cmd.userId },
        data: {
          consentGivenAt: now,
          consentVersion: cmd.version,
        },
      });
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`User ${cmd.userId} not found`);
      }
      throw err;
    }

    await this.audit.record({
      actorId: cmd.userId,
      action: 'user.consent.given',
      targetType: 'user',
      targetId: cmd.userId,
      after: { consentVersion: cmd.version, consentGivenAt: now.toISOString() },
    });

    return { consentGivenAt: now.toISOString(), version: cmd.version };
  }
}
