import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

export interface GrantRoleCommand {
  caller: AuthenticatedUser;
  targetEmail: string;
  targetRole: Role;
  scopeKlubId: string | null;
  scopeSportId: string | null;
}

const PLATFORM_ADMIN_QUOTA = 3;

/**
 * Sprint Polish PR-J2 — concede role a um user (por email).
 *
 * Regras:
 *   - PLATFORM_OWNER: não pode ser concedido via API (singleton, transferido só
 *     por migration ou comando explícito que não existe ainda).
 *   - PLATFORM_ADMIN: quota max {@link PLATFORM_ADMIN_QUOTA}; só Owner pode
 *     conceder (PolicyEngine bloqueia outros).
 *   - KLUB_ADMIN: também não via grant — handoff é via comando dedicado de
 *     transferência (futuro).
 *   - KLUB_ASSISTANT/SPORT_*: vários por escopo.
 *   - Idempotência: se já existir assignment com mesmo {userId, role, scopeKlubId,
 *     scopeSportId}, retorna o existente (não duplica).
 */
@Injectable()
export class GrantRoleHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyEngine,
  ) {}

  async execute(cmd: GrantRoleCommand): Promise<{ id: string; userId: string }> {
    if (cmd.targetRole === 'PLATFORM_OWNER' || cmd.targetRole === 'KLUB_ADMIN') {
      throw new BadRequestException(
        `Role ${cmd.targetRole} não pode ser concedida via grant — use o fluxo de transferência.`,
      );
    }

    if (
      !this.policy.can(cmd.caller, 'role.grant', {
        targetRole: cmd.targetRole,
        klubId: cmd.scopeKlubId ?? undefined,
        sportId: cmd.scopeSportId ?? undefined,
      })
    ) {
      throw new ForbiddenException('Sem permissão pra conceder essa role nesse scope.');
    }

    const target = await this.prisma.user.findUnique({
      where: { email: cmd.targetEmail },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException(`Nenhum user encontrado pro email ${cmd.targetEmail}.`);
    }

    if (cmd.targetRole === 'PLATFORM_ADMIN') {
      const count = await this.prisma.roleAssignment.count({
        where: { role: 'PLATFORM_ADMIN' },
      });
      if (count >= PLATFORM_ADMIN_QUOTA) {
        throw new ConflictException(
          `Quota de PLATFORM_ADMIN atingida (${PLATFORM_ADMIN_QUOTA}). Revogue um existente antes de conceder novo.`,
        );
      }
    }

    const existing = await this.prisma.roleAssignment.findFirst({
      where: {
        userId: target.id,
        role: cmd.targetRole,
        scopeKlubId: cmd.scopeKlubId,
        scopeSportId: cmd.scopeSportId,
      },
      select: { id: true },
    });
    if (existing) {
      return { id: existing.id, userId: target.id };
    }

    const created = await this.prisma.roleAssignment.create({
      data: {
        userId: target.id,
        role: cmd.targetRole,
        scopeKlubId: cmd.scopeKlubId,
        scopeSportId: cmd.scopeSportId,
        grantedBy: cmd.caller.userId,
      },
      select: { id: true },
    });

    return { id: created.id, userId: target.id };
  }
}
