import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';
import { FeaturesFacade } from '../../modules/features/public/features.facade';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

/**
 * Guard que verifica se uma feature gate está habilitada para o usuário
 * atual. Deve ser usado APÓS o FirebaseAuthGuard (requer user no request).
 *
 * Uso:
 *   @UseGuards(FirebaseAuthGuard, FeatureGuard)
 *   @RequireFeature('ai_match_suggestions')
 *   @Get()
 *   async someEndpoint(...) { ... }
 *
 * Fail-closed: feature inexistente → 403.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly features: FeaturesFacade,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureId = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureId) return true;

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Autenticação necessária para acessar esta feature');
    }

    const allowed = await this.features.isEnabled(featureId, user);
    if (!allowed) {
      throw new ForbiddenException('Feature não disponível no seu plano');
    }

    return true;
  }
}
