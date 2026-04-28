import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Role } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

export interface RoleAssignmentListItem {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  role: Role;
  scopeKlubId: string | null;
  scopeSportId: string | null;
  grantedAt: string;
  grantedBy: string | null;
}

export interface ListRoleAssignmentsQuery {
  caller: AuthenticatedUser;
  /**
   * `null` lista platform-level (scopeKlubId IS NULL). UUID lista assignments
   * scoped no Klub. Não suportamos listagem global por enquanto.
   */
  scopeKlubId: string | null;
}

@Injectable()
export class ListRoleAssignmentsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyEngine,
  ) {}

  async execute(query: ListRoleAssignmentsQuery): Promise<RoleAssignmentListItem[]> {
    if (!this.policy.can(query.caller, 'role.list', { klubId: query.scopeKlubId ?? undefined })) {
      throw new ForbiddenException('Sem permissão pra listar role assignments.');
    }

    const rows = await this.prisma.roleAssignment.findMany({
      where: {
        scopeKlubId: query.scopeKlubId,
        // Player não conta como "equipe administrativa"; filtramos pra UI ficar
        // focada nos roles operacionais.
        role: { not: 'PLAYER' },
      },
      include: {
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { grantedAt: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user.email,
      userFullName: r.user.fullName,
      role: r.role as Role,
      scopeKlubId: r.scopeKlubId,
      scopeSportId: r.scopeSportId,
      grantedAt: r.grantedAt.toISOString(),
      grantedBy: r.grantedBy,
    }));
  }
}
