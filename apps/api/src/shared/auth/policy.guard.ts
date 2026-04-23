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
import type { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyEngine: PolicyEngine,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    const resourceContext = policy.extractContext ? policy.extractContext(request) : {};

    if (!this.policyEngine.can(user, policy.action, resourceContext)) {
      throw new ForbiddenException(`Action '${policy.action}' not permitted`);
    }

    return true;
  }
}
