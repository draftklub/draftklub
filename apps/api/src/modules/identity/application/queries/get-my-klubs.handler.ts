import { Injectable } from '@nestjs/common';
import type { UserKlubMembership } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

/** Precedência de role pra computar a "role mais alta" do user num Klub. */
const ROLE_PRIORITY: Record<string, number> = {
  KLUB_ADMIN: 100,
  SPORTS_COMMITTEE: 80,
  STAFF: 60,
  TEACHER: 50,
  PLAYER: 10,
  SUPER_ADMIN: 200, // global, mas se aparecer escopado também ranqueia alto
};

@Injectable()
export class GetMyKlubsHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista Klubs do user logado: faz JOIN de Membership × Klub e mistura
   * com a maior `RoleAssignment.role` que o user tem escopada naquele
   * Klub. Filtra Klubs soft-deleted.
   */
  async execute(userId: string): Promise<UserKlubMembership[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        klub: {
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
            status: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const visible = memberships.filter((m) => m.klub.deletedAt == null);
    if (visible.length === 0) return [];

    const klubIds = visible.map((m) => m.klubId);
    const roles = await this.prisma.roleAssignment.findMany({
      where: { userId, scopeKlubId: { in: klubIds } },
      select: { role: true, scopeKlubId: true },
    });

    // Pra cada Klub, escolhe a role com maior prioridade.
    const roleByKlub = new Map<string, string>();
    for (const r of roles) {
      if (!r.scopeKlubId) continue;
      const current = roleByKlub.get(r.scopeKlubId);
      const currentPri = current ? (ROLE_PRIORITY[current] ?? 0) : -1;
      const candidatePri = ROLE_PRIORITY[r.role] ?? 0;
      if (candidatePri > currentPri) {
        roleByKlub.set(r.scopeKlubId, r.role);
      }
    }

    return visible.map((m): UserKlubMembership => {
      const role = roleByKlub.get(m.klubId) ?? null;
      return {
        klubId: m.klubId,
        klubSlug: m.klub.slug,
        klubName: m.klub.name,
        klubPlan: m.klub.plan as UserKlubMembership['klubPlan'],
        klubStatus: m.klub.status as UserKlubMembership['klubStatus'],
        membershipType: m.type as UserKlubMembership['membershipType'],
        membershipStatus: m.status as UserKlubMembership['membershipStatus'],
        role: role as UserKlubMembership['role'],
        joinedAt: m.joinedAt.toISOString(),
      };
    });
  }
}
