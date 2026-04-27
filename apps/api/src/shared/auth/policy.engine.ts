import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { ResourceContext } from './resource-context.interface';

/**
 * Ações liberadas pra qualquer user autenticado (sem roleAssignments).
 * Use com parcimônia — cada entrada aqui amplia o ataque surface.
 *
 * `klub.create`: self-service de Klub novo (Onda 1, fluxo /criar-klub).
 * Logo após criar, o user vira KLUB_ADMIN automaticamente — daí em
 * diante respeita o scope normal.
 *
 * `klub.join_via_link`: aceitar convite por link compartilhado (Onda 1,
 * fluxo /convite/:slug). Cria Membership + RoleAssignment PLAYER pra
 * user atual no Klub identificado pelo slug. Idempotente — re-aceitar
 * o mesmo link no-op. Trade-off: qualquer pessoa com o link pode
 * entrar como PLAYER. Onda 2 vai trocar por sistema de Invitation
 * tokens revogáveis.
 */
const PUBLIC_AUTHENTICATED_ACTIONS: ReadonlySet<string> = new Set([
  'klub.create',
  'klub.join_via_link',
]);

@Injectable()
export class PolicyEngine {
  can(user: AuthenticatedUser, action: string, resource: ResourceContext = {}): boolean {
    if (user.roleAssignments.some((r) => r.role === 'SUPER_ADMIN')) {
      return true;
    }

    if (PUBLIC_AUTHENTICATED_ACTIONS.has(action)) {
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
        return ['tournament', 'match', 'ranking', 'rating', 'klub', 'sport', 'booking'].includes(
          domain,
        );

      case 'TEACHER':
        return domain === 'academy' || domain === 'class';

      case 'STAFF':
        return domain === 'booking' && ['create', 'approve', 'cancel_others'].includes(operation);

      case 'PLAYER':
        if (operation === 'read') return true;
        if (domain === 'match' && ['create', 'confirm'].includes(operation)) return true;
        if (domain === 'booking' && operation === 'create') return true;
        if (resource.ownerId != null && resource.ownerId === user.userId) return true;
        return false;

      default:
        return false;
    }
  }
}
