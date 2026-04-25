import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { POLICY_KEY, type PolicyMetadata } from './require-policy.decorator';
import { PolicyEngine } from './policy.engine';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './authenticated-user.interface';
import type { ResourceContext } from './resource-context.interface';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyEngine: PolicyEngine,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<PolicyMetadata | undefined>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    let resource: ResourceContext = policy.extractContext ? policy.extractContext(request) : {};

    if (policy.resolveKlubIdFrom === 'tournament:tournamentId' && !resource.klubId) {
      const klubId = await this.resolveKlubIdFromTournamentParam(request);
      if (klubId) {
        resource = { ...resource, klubId };
      }
    } else if (policy.resolveKlubIdFrom === 'ranking:id' && !resource.klubId) {
      const klubId = await this.resolveKlubIdFromRankingParam(request);
      if (klubId) {
        resource = { ...resource, klubId };
      }
    } else if (policy.resolveKlubIdFrom === 'booking:bookingId' && !resource.klubId) {
      const klubId = await this.resolveKlubIdFromBookingParam(request);
      if (klubId) {
        resource = { ...resource, klubId };
      }
    }

    if (!this.policyEngine.can(user, policy.action, resource)) {
      throw new ForbiddenException(`Action '${policy.action}' not permitted`);
    }

    return true;
  }

  private async resolveKlubIdFromTournamentParam(
    request: FastifyRequest,
  ): Promise<string | null> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    const tournamentId = params.tournamentId;

    // Defensive: skip lookup when param is missing, empty, or not a valid UUID.
    // Downstream handler will 404/400 as appropriate.
    if (!tournamentId || !UUID_REGEX.test(tournamentId)) {
      return null;
    }

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { klubSport: { select: { klubId: true } } },
    });

    return tournament?.klubSport.klubId ?? null;
  }

  private async resolveKlubIdFromRankingParam(
    request: FastifyRequest,
  ): Promise<string | null> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    const rankingId = params.id ?? params.rankingId;

    if (!rankingId || !UUID_REGEX.test(rankingId)) {
      return null;
    }

    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: rankingId },
      select: { klubSport: { select: { klubId: true } } },
    });

    return ranking?.klubSport.klubId ?? null;
  }

  private async resolveKlubIdFromBookingParam(
    request: FastifyRequest,
  ): Promise<string | null> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    const bookingId = params.bookingId;

    if (!bookingId || !UUID_REGEX.test(bookingId)) {
      return null;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { klubId: true },
    });

    return booking?.klubId ?? null;
  }
}
