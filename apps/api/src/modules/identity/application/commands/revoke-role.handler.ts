import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Role } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import { AuditService } from '../../../../shared/audit/audit.service';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

export interface RevokeRoleCommand {
  caller: AuthenticatedUser;
  assignmentId: string;
  /**
   * Scope esperado da assignment. `null` = endpoint platform-level (assignment
   * deve ter `scopeKlubId IS NULL`); UUID = klub-scoped (deve bater).
   */
  expectedScopeKlubId: string | null;
}

/**
 * Sprint Polish PR-J2 — revoga role assignment.
 *
 * - PLATFORM_OWNER nunca é revogável via API (singleton, a única transferência
 *   futura entra como comando dedicado).
 * - KLUB_ADMIN também não — handoff dedicado.
 * - Bloqueia self-revoke pra evitar usuário se trancar pra fora do Klub
 *   acidentalmente (Owner não revoga seu Owner; Admin não revoga seu próprio
 *   KLUB_ADMIN).
 */
@Injectable()
export class RevokeRoleHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyEngine,
    private readonly audit: AuditService,
  ) {}

  async execute(cmd: RevokeRoleCommand): Promise<{ id: string }> {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id: cmd.assignmentId },
      select: {
        id: true,
        userId: true,
        role: true,
        scopeKlubId: true,
        scopeSportId: true,
      },
    });
    if (!assignment) {
      throw new NotFoundException(`Role assignment ${cmd.assignmentId} não encontrada.`);
    }

    if (assignment.scopeKlubId !== cmd.expectedScopeKlubId) {
      throw new NotFoundException('Role assignment não pertence a esse scope.');
    }

    if (assignment.role === 'PLATFORM_OWNER' || assignment.role === 'KLUB_ADMIN') {
      throw new BadRequestException(
        `Role ${assignment.role} não pode ser revogada via API — use o fluxo de transferência.`,
      );
    }

    if (assignment.userId === cmd.caller.userId) {
      throw new BadRequestException('Você não pode revogar sua própria role.');
    }

    if (
      !this.policy.can(cmd.caller, 'role.revoke', {
        targetRole: assignment.role as Role,
        klubId: assignment.scopeKlubId ?? undefined,
        sportId: assignment.scopeSportId ?? undefined,
      })
    ) {
      throw new ForbiddenException('Sem permissão pra revogar essa role.');
    }

    await this.prisma.roleAssignment.delete({ where: { id: assignment.id } });

    await this.audit.record({
      actorId: cmd.caller.userId,
      action: 'role.revoked',
      targetType: 'role_assignment',
      targetId: assignment.id,
      before: {
        granteeUserId: assignment.userId,
        role: assignment.role,
        scopeKlubId: assignment.scopeKlubId,
        scopeSportId: assignment.scopeSportId,
      },
    });

    return { id: assignment.id };
  }
}
