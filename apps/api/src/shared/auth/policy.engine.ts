import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { ResourceContext } from './resource-context.interface';

/**
 * Ações liberadas pra qualquer user autenticado (sem roleAssignments).
 * Use com parcimônia — cada entrada aqui amplia o ataque surface.
 */
const PUBLIC_AUTHENTICATED_ACTIONS: ReadonlySet<string> = new Set([
  // Self-service de Klub novo. Logo após criar, o user vira KLUB_ADMIN.
  'klub.create',
  // Aceitar convite por link compartilhado.
  'klub.join_via_link',
  // Discovery — lista Klubs públicos.
  'klub.discover',
  // Preview de slug pro /criar-klub. Só leitura.
  'klub.check-slug',
  // Preview de CNPJ lookup (BrasilAPI) pro /criar-klub.
  'klub.cnpj-lookup',
]);

@Injectable()
export class PolicyEngine {
  can(user: AuthenticatedUser, action: string, resource: ResourceContext = {}): boolean {
    // Sprint Polish PR-J1 — PLATFORM_OWNER continua bypass total.
    if (user.roleAssignments.some((r) => r.role === 'PLATFORM_OWNER')) {
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
      case 'PLATFORM_ADMIN':
        // Tudo, EXCETO mexer em PLATFORM_OWNER ou outros PLATFORM_ADMINs.
        // Demote/promote/transfer dessas roles é privilégio do OWNER.
        if (
          domain === 'role' &&
          (resource.targetRole === 'PLATFORM_OWNER' || resource.targetRole === 'PLATFORM_ADMIN')
        ) {
          return false;
        }
        return true;

      case 'KLUB_ADMIN':
        // Tudo no scope do Klub (já garantido por scopeMatches).
        return true;

      case 'KLUB_ASSISTANT':
        // Mesma coisa do Klub Admin EXCETO operações sobre o role do
        // KLUB_ADMIN (demote/transfer). Bloqueia mexida no Admin.
        if (domain === 'role' && resource.targetRole === 'KLUB_ADMIN') {
          return false;
        }
        return true;

      case 'SPORT_COMMISSION':
        // Organização da modalidade: torneios, matches, ranking, ratings.
        // Booking incluído porque torneios geram bookings das quadras.
        // `klub.*` e `sport.*` liberados pra navegação.
        return ['tournament', 'match', 'ranking', 'rating', 'klub', 'sport', 'booking'].includes(
          domain,
        );

      case 'SPORT_STAFF':
        // Operação dia-a-dia: criar/aprovar/cancelar bookings.
        return domain === 'booking' && ['create', 'approve', 'cancel_others'].includes(operation);

      case 'PLAYER':
        if (operation === 'read') return true;
        // Sprint K PR-K5c — PLAYER do scope pode listar role assignments do
        // próprio Klub (transparência: ver quem é commission/staff). scope
        // match via scopeMatches já garante que só vê roles do próprio Klub.
        if (domain === 'role' && operation === 'list') return true;
        if (domain === 'match' && ['create', 'confirm'].includes(operation)) return true;
        if (domain === 'booking' && operation === 'create') return true;
        // Sprint M batch 4 — PLAYER do scope pode se inscrever em torneios
        // do próprio Klub e desistir. Approval/seeding/draw/manage seguem
        // sendo prerrogativa de SPORT_COMMISSION/KLUB_ADMIN.
        if (domain === 'tournament' && ['enroll', 'withdraw'].includes(operation)) return true;
        if (resource.ownerId != null && resource.ownerId === user.userId) return true;
        return false;

      default:
        return false;
    }
  }
}
