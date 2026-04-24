import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { ResourceContext } from './resource-context.interface';

@Injectable()
export class PolicyEngine {
  can(
    user: AuthenticatedUser,
    action: string,
    resource: ResourceContext = {},
  ): boolean {
    if (user.roleAssignments.some((r) => r.role === 'SUPER_ADMIN')) {
      return true;
    }

    const [domain, operation] = action.split('.');

    for (const assignment of user.roleAssignments) {
      if (!this.scopeMatches(assignment, resource)) continue;

      if (this.roleAllows(assignment.role, domain ?? '', operation ?? '', resource, user)) {
        return true;
      }
    }

    return false;
  }

  private scopeMatches(
    assignment: { scopeKlubId?: string | null; scopeSportId?: string | null },
    resource: ResourceContext,
  ): boolean {
    if (assignment.scopeKlubId != null && assignment.scopeKlubId !== resource.klubId) {
      return false;
    }
    if (assignment.scopeSportId != null && assignment.scopeSportId !== resource.sportId) {
      return false;
    }
    return true;
  }

  private roleAllows(
    role: string,
    domain: string,
    operation: string,
    resource: ResourceContext,
    user: AuthenticatedUser,
  ): boolean {
    switch (role) {
      case 'KLUB_ADMIN':
        return true;

      case 'SPORTS_COMMITTEE':
        return ['tournament', 'match', 'ranking', 'rating', 'klub'].includes(domain);

      case 'TEACHER':
        return domain === 'academy' || domain === 'class';

      case 'PLAYER':
        if (operation === 'read') return true;
        if (resource.ownerId != null && resource.ownerId === user.userId) return true;
        return ['reservation', 'match'].includes(domain) && operation === 'create';

      default:
        return false;
    }
  }
}
